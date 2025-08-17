import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { MainGameScene } from '../game/scenes/MainGameScene';
import { GameState, PlayerState, Card, Action, CardTemplate, Deck } from '../types'; // Added Deck
import HandView from './HandView';
import DeckInfo from './DeckInfo';
import Modal from './Modal';
import { launch } from '../game/PhaserGame';
import { createMatch, putAction, watchActions, writeState, watchGameState, fetchCardTemplates } from '../api/realtimeClient';
import { NullAuthAdapter } from '../auth/NullAuthAdapter';
import { database } from '../firebaseConfig';
import { ref, set } from 'firebase/database';
import Phaser from 'phaser';
import { choose_card } from '../game/ai/ai';
import useLocalStorage from '../hooks/useLocalStorage';

interface GameViewProps {
  // Props will be added later if needed, e.g., onGameEnd
}

const MAX_STACK_IMAGES = 6; // 表示する画像の最大枚数
const STACK_OFFSET_X = 2;   // X軸のずれ量 (px)
const STACK_OFFSET_Y = 2;   // Y軸のずれ量 (px)

const GameView: React.FC<GameViewProps> = () => {
  console.log('GameView: selectedDeckId from useLocalStorage:', selectedDeckId); // ADDED LOG
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [cardTemplates, setCardTemplates] = useState<{ [templateId: string]: CardTemplate }>({});
  const [gameStarted, setGameStarted] = useState<boolean>(false); // New state for game start
  const [isPhaserReady, setIsPhaserReady] = useState<boolean>(false);
  const [hasRequiredDecks, setHasRequiredDecks] = useState<boolean>(false); // NEW STATE
  const [selectedDeckId, setSelectedDeckId] = useLocalStorage<string | null>('selectedDeckId', null); // Use useLocalStorage

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalContent, setModalContent] = useState<'deck' | 'discard' | null>(null);

  const engineRef = useRef<GameEngine | null>(null);
  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const isResolvingTurnRef = useRef(false);

  console.log('GameView component rendered. phaserContainerRef.current:', phaserContainerRef.current);

  useEffect(() => {
    const authAdapter = new NullAuthAdapter();
    const currentClientId = authAdapter.getClientId();
    setClientId(currentClientId);

    const npcId = 'npc-player-id';
    setOpponentId(npcId);

    const setupMatch = async () => {
      console.log('GameView: selectedDeckId inside setupMatch:', selectedDeckId); // ADDED LOG
      const fetchedCardTemplates = await fetchCardTemplates('v1');
      // Filter out '資金集め' card template
      const filteredCardTemplates = Object.fromEntries(
        Object.entries(fetchedCardTemplates).filter(([id, template]) => template.templateId !== 'GAIN_FUNDS')
      );
      setCardTemplates(filteredCardTemplates);

      // --- NEW LOGIC FOR LOADING DECKS ---
      // selectedDeckId is now from useLocalStorage hook
      let playerDeck: Deck | null = null;
      if (selectedDeckId) {
        try {
          playerDeck = await getDeck(selectedDeckId);
          console.log('Loaded player deck:', playerDeck);
        } catch (error) {
          console.error('Failed to load player deck:', error);
          // localStorage.removeItem('selectedDeckId'); // This is handled by useLocalStorage now
          // Optionally, set a user-facing error message here
        }
      } else {
        console.warn('No selectedDeckId found. Please select a deck.');
        // Optionally, set a user-facing message here
      }

      let npcDeck: Deck | null = null;
      try {
        const response = await fetch('/decks/npc_default_deck.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        npcDeck = await response.json();
        console.log('Loaded NPC deck:', npcDeck);
      } catch (error) {
        console.error('Failed to load NPC default deck:', error);
        // Optionally, set a user-facing error message here
      }

      if (!playerDeck || !npcDeck) {
        console.error('Missing player or NPC deck. Cannot start game.');
        setHasRequiredDecks(false); // Set to false if decks are missing
        return; // Prevent further initialization
      }
      setHasRequiredDecks(true); // Both decks loaded successfully
      // --- END NEW LOGIC ---

      const currentMatchId = await createMatch();
      setMatchId(currentMatchId);

      const unsubscribeState = watchGameState(currentMatchId, (dbGameState) => {
        if (dbGameState) {
          // IMPORTANT: Re-initialize GameEngine with the new state
          engineRef.current = new GameEngine(dbGameState, fetchedCardTemplates);
          setGameState(dbGameState);
          const currentPlayerState = dbGameState.players.find((p: PlayerState) => p.playerId === currentClientId);
          if (currentPlayerState) {
            setPlayerHand(currentPlayerState.hand);
          }
        }
      });

      const unsubscribeActions = watchActions(currentMatchId, async (actions) => {
        if (isResolvingTurnRef.current) {
          console.log('Mutex: Already locked, skipping duplicate trigger.');
          return;
        }
        isResolvingTurnRef.current = true;
        console.log('Mutex: Locked.');

        try {
          if (engineRef.current?.getState().phase === 'GAME_OVER') {
            console.log('Mutex: Game is over, skipping action resolution. (Early exit)');
            return;
          }

          const player1Action = actions[currentClientId];
          const player2Action = actions[npcId];

          if (!player1Action || !player2Action) { // Combine the check
            console.log('Mutex: Actions not yet complete, waiting for opponent. (Early exit)');
            return;
          }

          // If we reach here, both actions are present
          console.log('Mutex: Both players submitted actions. Resolving turn...');
          if (engineRef.current) {
            console.log('watchActions: Calling applyAction...');
            const newGameState = engineRef.current.applyAction(player1Action, player2Action);
            console.log('watchActions: applyAction returned newGameState:', newGameState);
            await writeState(currentMatchId, newGameState);
            console.log('watchActions: writeState completed.');
          }
        } finally {
          isResolvingTurnRef.current = false;
          console.log('Mutex: Unlocked.');
        }
      });

      return () => {
        unsubscribeState();
        unsubscribeActions();
      };
    };

    setupMatch();
  }, [selectedDeckId]); // Dependency array now includes selectedDeckId

  // Effect to launch Phaser game when container ref is available

  useEffect(() => {
    console.log('Phaser useEffect: Running. phaserContainerRef.current:', phaserContainerRef.current, 'gameRef.current:', gameRef.current);

    // Only launch if container is available AND game is not already launched
    if (phaserContainerRef.current && !gameRef.current) {
      console.log('Phaser useEffect: Launching Phaser game.');
      const gameInstance = launch(phaserContainerRef.current);
      gameRef.current = gameInstance; // Assign to ref
      setIsPhaserReady(true); // Phaser is ready, hide loading overlay

      // Listen for startGame event from Phaser TitleScene
      gameInstance.events.on('startGame', async () => {
        console.log('startGame event received from Phaser! Setting gameStarted to true.');
        setGameStarted(true);

        // Initialize game state and advance turn here
        // Ensure decks are available before creating initial state
        if (clientId && opponentId && Object.keys(cardTemplates).length > 0 && hasRequiredDecks) { // Added hasRequiredDecks
          // Re-fetch player and NPC decks to ensure they are available for GameEngine.createInitialState
          // selectedDeckId is now from useLocalStorage hook
          let playerDeck: Deck | null = null;
          if (selectedDeckId) {
            try {
              playerDeck = await getDeck(selectedDeckId);
            } catch (error) {
              console.error('Failed to re-fetch player deck for game start:', error);
            }
          }

          let npcDeck: Deck | null = null;
          try {
            const response = await fetch('/decks/npc_default_deck.json');
            if (response.ok) {
              npcDeck = await response.json();
            } else {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          } catch (error) {
            console.error('Failed to re-fetch NPC default deck for game start:', error);
          }

          if (playerDeck && npcDeck) { // Ensure both decks are present before creating state
            const initialGameState = GameEngine.createInitialState(clientId, opponentId, cardTemplates, playerDeck, npcDeck);
            engineRef.current = new GameEngine(initialGameState, cardTemplates);
            const gameStateWithInitialHand = engineRef.current.advanceTurn();
            if (matchId) { // Ensure matchId is available
              await writeState(matchId, gameStateWithInitialHand);
            }
          } else {
            console.error('Cannot start game: Player or NPC deck not available after re-fetch.');
            // Optionally, display an error message to the user
          }
        } else {
          console.error('Cannot start game: Missing client ID, opponent ID, card templates, or required decks.');
        }
        // The scene transition is now handled by TitleScene.ts
      });
    }

    return () => {
      console.log('Phaser useEffect: Cleanup function running.');
      // Only destroy if gameRef.current is a valid Phaser instance
      if (gameRef.current && gameRef.current.isBooted) {
        console.log('Phaser useEffect: Destroying Phaser game.');
        gameRef.current.destroy(true);
        gameRef.current = null;
      } else {
        console.log('Phaser useEffect: Game not booted or already destroyed, skipping destruction.');
      }
    };
  }, [clientId, opponentId, cardTemplates, matchId, hasRequiredDecks]); // Added hasRequiredDecks to dependencies

  const isGameOverHandledRef = useRef(false);

  useEffect(() => {
    if (gameRef.current && matchId) {
      const handleAnimationComplete = async () => {
        if (engineRef.current && matchId) {
          const currentState = engineRef.current.getState();
          if (currentState.phase !== 'RESOLUTION' && currentState.phase !== 'GAME_OVER') {
            console.log(`handleAnimationComplete: Skipped because phase is not RESOLUTION or GAME_OVER (it is ${currentState.phase}).`);
            return;
          }

          if (currentState.phase === 'GAME_OVER') {
            if (!isGameOverHandledRef.current) {
              isGameOverHandledRef.current = true;
              console.log('Game is over after animation. Not advancing turn. Emitting gameOver event.');
              const playerState = engineRef.current.getState().players.find(p => p.playerId === clientId);
              const message = playerState && playerState.properties > 0 ? 'You Win!' : 'You Lose!';
              const isWin = playerState && playerState.properties > 0;
              gameRef.current.events.emit('gameOver', message, isWin);
            } else {
              console.log('Game is over, but gameOver event already handled.');
            }
            return;
          }

          console.log('GameView: Received animationComplete event. Advancing turn.');
          const nextTurnState = engineRef.current.advanceTurn();
          await writeState(matchId, nextTurnState);
          await set(ref(database, `matches/${matchId}/actions`), {});
        }
      };

      gameRef.current.events.on('animationComplete', handleAnimationComplete);

      return () => {
        gameRef.current?.events.off('animationComplete', handleAnimationComplete);
      };
    }
  }, [gameRef.current, matchId, clientId]);

  useEffect(() => {
    if (gameRef.current && gameState && Object.keys(cardTemplates).length > 0 && clientId) {
      gameRef.current.registry.set('gameState', gameState);
      gameRef.current.registry.set('cardTemplates', cardTemplates);
      gameRef.current.events.emit('loadCardImages'); // Emit event to load card images
      gameRef.current.registry.set('clientId', clientId);

      if (gameState.lastActions && gameState.lastActions.length > 0) {
        const scene = gameRef.current?.scene.getScene('MainGameScene') as MainGameScene;
        if (scene) {
          console.log('GameView: Calling scene.displayTurnActions with:', gameState.lastActions);
          scene.displayTurnActions(gameState.lastActions);
        } else {
          console.error('MainGameScene not found');
        }
      }
    }
  }, [gameState, cardTemplates, clientId]);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleCardSelect = (action: Action | null) => {
    if (action === null) {
      setSelectedCardId(null);
    } else if (action.actionType === 'play_card') {
      setSelectedCardId(action.cardId || null);
    } else if (action.actionType === 'collect_funds') {
      setSelectedCardId('COLLECT_FUNDS_COMMAND');
    }
  };

  const handlePlayTurn = async () => {
    if (gameState?.phase === 'GAME_OVER') return;

    if (engineRef.current && gameState && matchId && clientId && opponentId) {
      let player1Action: Action | null = null;
      if (selectedCardId) {
        if (selectedCardId === 'COLLECT_FUNDS_COMMAND') {
          player1Action = { playerId: clientId, actionType: 'collect_funds' };
        } else {
          player1Action = { playerId: clientId, actionType: 'play_card', cardId: selectedCardId };
        }
      }

      const npcPlayerState = gameState.players.find(p => p.playerId === opponentId);
      let player2Action: Action | null = null;
      if (npcPlayerState) { // Removed hand.length > 0 check
        console.log('handlePlayTurn: npcPlayerState.hand:', npcPlayerState.hand);
        const chosenCard = choose_card(gameState, npcPlayerState.hand, Date.now(), cardTemplates);
        if (chosenCard) {
          player2Action = chosenCard;
        }
      }

      // Prepare actions to be written to DB
      const actionsToSubmit: { [key: string]: Action } = {};
      if (player1Action) {
        actionsToSubmit[clientId] = player1Action;
      }
      if (player2Action) {
        actionsToSubmit[opponentId] = player2Action;
      }

      // Write both actions to the database in a single operation
      await set(ref(database, `matches/${matchId}/actions`), actionsToSubmit);

      setSelectedCardId(null);
    }
  };

  // State variables for rendering UI
  const currentPlayerState = gameState?.players.find(p => p.playerId === clientId);
  const opponentState = gameState?.players.find(p => p.playerId === opponentId);
  const playableCardIds = currentPlayerState && engineRef.current
    ? engineRef.current.getPlayableCards(currentPlayerState).map(card => card.id)
    : [];

  // Logic to determine which logs are "latest"
  const logsToRender = (() => {
    if (!gameState) return [];
    
    // Map logs to include their original index
    const logsWithOriginalIndex = gameState.log.map((text, index) => ({ text, originalIndex: index }));
    
    // Find the index of the last turn marker
    const lastTurnMarkerIndex = gameState.log.findLastIndex((log: string) => log.startsWith('ターン'));

    // Take the last 6 logs to be displayed
    const slicedLogs = logsWithOriginalIndex.slice(-6);

    // Map them to include the isLatest flag
    return slicedLogs.map(logItem => ({
      ...logItem,
      isLatest: lastTurnMarkerIndex === -1 || logItem.originalIndex >= lastTurnMarkerIndex,
    })).reverse(); // Reverse for display
  })();

  const handleDeckClick = () => {
    setModalTitle('山札');
    setModalContent('deck');
    setIsModalOpen(true);
  };

  const handleDiscardClick = () => {
    setModalTitle('捨て札');
    setModalContent('discard');
    setIsModalOpen(true);
  };

  return (
    <div className="game-container">
      {/* Main area for Phaser canvas and HUDs */}
      <div className="main-area">
        <div id="phaser-game-container" ref={phaserContainerRef}></div>
        {gameStarted && gameState && (
          <>
            {/* Opponent HUD */}
            {opponentState && (
              <div className="hud opponent-hud">
                <h2>対戦相手</h2>
                <p>資金: {opponentState.funds}</p>
                <p>不動産: {opponentState.properties}</p>
              </div>
            )}
            {/* Opponent Deck Area */}
            {opponentState && (
              <div className="hud opponent-deck-area">
                <h2>山札：{opponentState.deck.length}枚</h2>
                {Array.from({ length: Math.min(opponentState.deck.length, MAX_STACK_IMAGES) }).map((_, index) => (
                  <img
                    key={`opponent-deck-${index}`}
                    src="images/cards/card_back.jpg"
                    alt="Card Back"
                    className="card-stack-image"
                    style={{
                      transform: `translate(calc(-50% + ${index * STACK_OFFSET_X}px), calc(-50% + ${index *STACK_OFFSET_Y}px))`,
                      zIndex: index,
                    }}
                  />
                ))}
              </div>
            )}
            {/* Opponent Discard Area */}
            {opponentState && (
              <div className="hud opponent-discard-area">
                <h2>捨札：{opponentState.discard.length}枚</h2>
                {Array.from({ length: Math.min(opponentState.discard.length, MAX_STACK_IMAGES) }).map((_, index) => (
                  <img
                    key={`opponent-discard-${index}`}
                    src="images/cards/card_back.jpg"
                    alt="Card Back"
                    className="card-stack-image"
                    style={{
                      transform: `translate(calc(-50% + ${index * STACK_OFFSET_X}px), calc(-50% + ${index *STACK_OFFSET_Y}px))`,
                      zIndex: index,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Player HUD */}
            {currentPlayerState && (
              <div className="hud player-hud">
                <h2>プレイヤー</h2>
                <p>資金: {currentPlayerState.funds}</p>
                <p>不動産: {currentPlayerState.properties}</p>
              </div>
            )}
            {/* Player Deck Area */}
            {currentPlayerState && (
              <div className="hud player-deck-area clickable" onClick={handleDeckClick}>
                <h2>山札：{currentPlayerState.deck.length}枚</h2>
                {Array.from({ length: Math.min(currentPlayerState.deck.length, MAX_STACK_IMAGES) }).map((_, index) => (
                  <img
                    key={`player-deck-${index}`}
                    src="images/cards/card_back.jpg"
                    alt="Card Back"
                    className="card-stack-image"
                    style={{
                      transform: `translate(calc(-50% + ${index * STACK_OFFSET_X}px), calc(-50% + ${index *STACK_OFFSET_Y}px))`,
                      zIndex: index,
                    }}
                  />
                ))}
              </div>
            )}
            {/* Player Discard Area */}
            {currentPlayerState && (
              <div className="hud player-discard-area clickable" onClick={handleDiscardClick}>
                <h2>捨札：{currentPlayerState.discard.length}枚</h2>
                {Array.from({ length: Math.min(currentPlayerState.discard.length, MAX_STACK_IMAGES) }).map((_, index) => (
                  <img
                    key={`player-discard-${index}`}
                    src="images/cards/card_back.jpg"
                    alt="Card Back"
                    className="card-stack-image"
                    style={{
                      transform: `translate(calc(-50% + ${index * STACK_OFFSET_X}px), calc(-50% + ${index *STACK_OFFSET_Y}px))`,
                      zIndex: index,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Player area with hand and actions, only visible when game has started */}
      {gameStarted && gameState && (
        <div className="player-area">
          <div className="bottom-panel">
            <div className="game-log-area">
              <div className="log-entries">
                {logsToRender.map((logItem) => (
                  <p key={logItem.originalIndex} className={logItem.isLatest ? 'latest-log' : ''}>{logItem.text}</p>
                ))}
              </div>
            </div>
            <HandView hand={playerHand} onCardSelect={handleCardSelect} playableCardIds={playableCardIds} cardTemplates={cardTemplates} selectedCardId={selectedCardId} playerId={clientId || ''} />

            <div className="action-bar">
              {/* 資金集めボタン */}
              <div
                id="gain-funds-button" // Unique ID for the button
                className={`action-card-item ${selectedCardId === 'COLLECT_FUNDS_COMMAND' ? 'selected' : ''}`} // Apply styling and selected class
                onClick={() => {
                  if (selectedCardId === 'COLLECT_FUNDS_COMMAND') {
                    handleCardSelect(null);
                  } else {
                    handleCardSelect({ playerId: clientId, actionType: 'collect_funds' });
                  }
                }}
              >
                <p className="action-card-name">資金集め</p>
              </div>

              <button onClick={handlePlayTurn} disabled={!selectedCardId || gameState.phase === 'GAME_OVER'} className="play-button">
                Play Turn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay, only visible before Phaser is ready AND decks are loaded */}
      {!isPhaserReady && (
        <div className="loading-overlay visible">
          <p>Loading game...</p>
        </div>
      )}

      {/* Overlay for "no deck selected" or loading failure */}
      {!hasRequiredDecks && isPhaserReady && (
        <div className="loading-overlay visible">
          <p>まずは「デッキ構築」を行いましょう！</p>
        </div>
      )}

      {/* Modal for Deck/Discard Info */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        {modalContent === 'deck' && currentPlayerState && (
          <DeckInfo cards={currentPlayerState.deck} cardTemplates={cardTemplates} isDeck={true} />
        )}
        {modalContent === 'discard' && currentPlayerState && (
          <DeckInfo cards={currentPlayerState.discard} cardTemplates={cardTemplates} isDeck={false} />
        )}
      </Modal>
    </div>
  );
};

export default GameView;