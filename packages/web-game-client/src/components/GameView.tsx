import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { MainGameScene } from '../game/scenes/MainGameScene';
import { GameState, PlayerState, Card, Action, CardTemplate, Deck } from '../types';
import HandView from './HandView';
import DeckInfo from './DeckInfo';
import Modal from './Modal';
import { launch } from '../game/PhaserGame';
import { createMatch, watchActions, writeState, watchGameState, fetchCardTemplates } from '../api/realtimeClient';
import { NullAuthAdapter } from '../auth/NullAuthAdapter';
import { database } from '../firebaseConfig';
import { ref, set } from 'firebase/database';
import Phaser from 'phaser';
import { choose_card } from '../game/ai/ai';
import { getDeck } from '../api/deckApi';

interface GameViewProps {
  selectedDeckId: string | null;
}

const MAX_STACK_IMAGES = 6; // 表示する画像の最大枚数
const STACK_OFFSET_X = 2;   // X軸のずれ量 (px)
const STACK_OFFSET_Y = 2;   // Y軸のずれ量 (px)

const GameView: React.FC<GameViewProps> = ({ selectedDeckId }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerDeck, setPlayerDeck] = useState<Deck | null>(null); // State for player's deck
  const [npcDeck, setNpcDeck] = useState<Deck | null>(null); // State for NPC's deck
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [cardTemplates, setCardTemplates] = useState<{ [templateId: string]: CardTemplate }>({});
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isPhaserReady, setIsPhaserReady] = useState<boolean>(false);
  const [hasRequiredDecks, setHasRequiredDecks] = useState<boolean>(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalContent, setModalContent] = useState<'deck' | 'discard' | null>(null);

  const engineRef = useRef<GameEngine | null>(null);
  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const isResolvingTurnRef = useRef(false);
  const isAdvancingTurnRef = useRef(false); // Add this line
  const isGameOverHandledRef = useRef(false);

  useEffect(() => {
    const initializeGame = async () => {
      console.log("InitializeGame: Starting...");

      // 1. Auth
      const authAdapter = new NullAuthAdapter();
      const currentClientId = authAdapter.getClientId();
      setClientId(currentClientId);
      const npcId = 'npc-player-id';
      setOpponentId(npcId);
      console.log(`InitializeGame: ClientID: ${currentClientId}, OpponentID: ${npcId}`);

      if (!selectedDeckId) {
        console.warn('InitializeGame: No deck selected. Aborting.');
        setHasRequiredDecks(false);
        setIsPhaserReady(true); // Allow showing the "select deck" message
        return;
      }

      // 2. Fetch all required data
      console.log("InitializeGame: Fetching required data...");
      const fetchedCardTemplates = await fetchCardTemplates('v1');
      const filteredTemplates = Object.fromEntries(
        Object.entries(fetchedCardTemplates).filter(([, template]) => template.templateId !== 'GAIN_FUNDS')
      );
      setCardTemplates(filteredTemplates);

      const playerDeckPromise = getDeck(selectedDeckId);
      const npcDeckPromise = fetch('/decks/npc_default_deck.json').then(res => res.json());

      const [loadedPlayerDeck, loadedNpcDeck] = await Promise.all([
        playerDeckPromise,
        npcDeckPromise
      ]).catch(error => {
        console.error("InitializeGame: Failed to load decks:", error);
        return [null, null];
      });

      if (!loadedPlayerDeck || !loadedNpcDeck) {
        console.error("InitializeGame: A required deck is missing. Aborting.");
        setHasRequiredDecks(false);
        return;
      }

      setPlayerDeck(loadedPlayerDeck);
      setNpcDeck(loadedNpcDeck);
      setHasRequiredDecks(true);
      console.log("InitializeGame: All data fetched and set.");

      // 3. Launch Phaser
      if (phaserContainerRef.current && !gameRef.current) {
        console.log("InitializeGame: Launching Phaser...");
        const gameInstance = launch(phaserContainerRef.current, filteredTemplates);
        gameRef.current = gameInstance;
        setIsPhaserReady(true);

        // Set clientId in Phaser Registry
        gameInstance.registry.set('clientId', currentClientId);

        // 4. Setup Firebase listeners and initial state post-launch
        const currentMatchId = await createMatch();
        setMatchId(currentMatchId);

        

        watchActions(currentMatchId, async (actions) => {
            if (isResolvingTurnRef.current || engineRef.current?.getState().phase === 'GAME_OVER') return;
            const player1Action = actions[currentClientId];
            const player2Action = actions[npcId];
            if (!player1Action || !player2Action) return;
            
            isResolvingTurnRef.current = true;
            try {
                if (engineRef.current) {
                    const newGameState = engineRef.current.applyAction(player1Action, player2Action);
                    await writeState(currentMatchId, newGameState);
                }
            } finally {
                isResolvingTurnRef.current = false;
            }
        });

        watchGameState(currentMatchId, async (dbGameState) => {
            if (!dbGameState || !engineRef.current || !currentMatchId) return;

            const currentPhase = engineRef.current.getState().phase;
            engineRef.current = new GameEngine(dbGameState, filteredTemplates);
            setGameState(dbGameState);
            const currentPlayerState = dbGameState.players.find((p) => p.playerId === currentClientId);
            if (currentPlayerState) setPlayerHand(currentPlayerState.hand);
            // Pass lastActions to Phaser Registry for animation
            if (dbGameState.lastActions) {
                gameRef.current?.registry.set('lastActions', dbGameState.lastActions);
            }

            // Check for game over first, before acquiring lock for turn advancement
            if (dbGameState.phase === 'GAME_OVER') {
                if (!isGameOverHandledRef.current) {
                    isGameOverHandledRef.current = true;
                    const playerState = dbGameState.players.find(p => p.playerId === clientId);
                    const message = playerState && playerState.properties > 0 ? 'You Win!' : 'You Lose!';
                    const isWin = playerState && playerState.properties > 0;
                    gameRef.current?.events.emit('gameOver', message, isWin);
                }
                // Ensure no further turn advancement happens if game is over
                isAdvancingTurnRef.current = false; 
                return;
            }

            // Only advance turn if the state has just been resolved and not already advancing
            if (dbGameState.phase === 'RESOLUTION' && !isAdvancingTurnRef.current) {
                isAdvancingTurnRef.current = true; // Acquire lock

                // Wait a bit for the resolution animation to be noticeable
                setTimeout(async () => {
                    try {
                        const nextTurnState = engineRef.current.advanceTurn();
                        await writeState(currentMatchId, nextTurnState);
                        // Clear actions for the new turn
                        await set(ref(database, `matches/${currentMatchId}/actions`), {});
                    } finally {
                        isAdvancingTurnRef.current = false; // Ensure lock is released
                    }
                }, 1000); // 1 second delay
            }
        });

        // 5. Create and write initial game state
        console.log("InitializeGame: Creating initial game state...");
        const initialGameState = GameEngine.createInitialState(currentClientId, npcId, filteredTemplates, loadedPlayerDeck, loadedNpcDeck);
        engineRef.current = new GameEngine(initialGameState, filteredTemplates);
        const gameStateWithInitialHand = engineRef.current.advanceTurn();
        await writeState(currentMatchId, gameStateWithInitialHand);
        setGameStarted(true); // Explicitly set game as started
        console.log("InitializeGame: Initial game state written to DB and game started.");
      }
    };

    initializeGame();

    return () => {
      if (gameRef.current && gameRef.current.isBooted) {
        console.log("GameView Cleanup: Destroying Phaser game instance.");
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [selectedDeckId]);

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
    if (gameState?.phase === 'GAME_OVER' || !engineRef.current || !gameState || !matchId || !clientId || !opponentId) return;

    // 1. Determine Player's Action
    let player1Action: Action | null = null;
    if (selectedCardId) {
      if (selectedCardId === 'COLLECT_FUNDS_COMMAND') {
        player1Action = { playerId: clientId, actionType: 'collect_funds' };
      } else {
        player1Action = { playerId: clientId, actionType: 'play_card', cardId: selectedCardId };
      }
    }

    // If player has not selected an action, do nothing.
    if (!player1Action) {
        console.warn('handlePlayTurn: Player action is null, aborting.');
        return;
    }

    // 2. Determine NPC's Action
    const npcPlayerState = gameState.players.find(p => p.playerId === opponentId);
    let player2Action: Action | null = null;
    if (npcPlayerState) {
      player2Action = choose_card(gameState, npcPlayerState.hand, Date.now(), cardTemplates);
    }

    // Fallback for NPC: If AI returns no action, default to collecting funds.
    if (!player2Action) {
        console.log('NPC action was null, defaulting to collect_funds.');
        player2Action = { playerId: opponentId, actionType: 'collect_funds' };
    }

    // 3. Submit both actions to the database
    const actionsToSubmit: { [key: string]: Action } = {
      [clientId]: player1Action,
      [opponentId]: player2Action,
    };

    await set(ref(database, `matches/${matchId}/actions`), actionsToSubmit);
    setSelectedCardId(null);
    isAdvancingTurnRef.current = false; // Reset the flag when a new turn is initiated
  };

  const currentPlayerState = gameState?.players.find(p => p.playerId === clientId);
  const opponentState = gameState?.players.find(p => p.playerId === opponentId);
  const playableCardIds = currentPlayerState && engineRef.current
    ? engineRef.current.getPlayableCards(currentPlayerState).map(card => card.id)
    : [];

  const logsToRender = (() => {
    if (!gameState) return [];
    const logsWithOriginalIndex = gameState.log.map((text, index) => ({ text, originalIndex: index }));
    const lastTurnMarkerIndex = gameState.log.findLastIndex((log: string) => log.startsWith('ターン'));
    const slicedLogs = logsWithOriginalIndex.slice(-6);
    return slicedLogs.map(logItem => ({
      ...logItem,
      isLatest: lastTurnMarkerIndex === -1 || logItem.originalIndex >= lastTurnMarkerIndex,
    })).reverse();
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
      <div className="main-area">
        <div id="phaser-game-container" ref={phaserContainerRef}></div>
        {gameStarted && gameState && (
          <>
            {opponentState && (
              <div className="hud opponent-hud">
                <h2>対戦相手</h2>
                <p>資金: {opponentState.funds}</p>
                <p>不動産: {opponentState.properties}</p>
              </div>
            )}
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
            {currentPlayerState && (
              <div className="hud player-hud">
                <h2>プレイヤー</h2>
                <p>資金: {currentPlayerState.funds}</p>
                <p>不動産: {currentPlayerState.properties}</p>
              </div>
            )}
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
              <div
                id="gain-funds-button"
                className={`action-card-item ${selectedCardId === 'COLLECT_FUNDS_COMMAND' ? 'selected' : ''}`}
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
      {!isPhaserReady && (
        <div className="loading-overlay visible">
          <p>Loading game...</p>
        </div>
      )}
      {!hasRequiredDecks && isPhaserReady && (
        <div className="loading-overlay visible">
          <p>まずは「デッキ構築」を行いましょう！</p>
        </div>
      )}
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
