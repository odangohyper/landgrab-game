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
  const isGameOverHandledRef = useRef(false);

  useEffect(() => {
    console.log(`GameView useEffect[selectedDeckId] triggered. ID: ${selectedDeckId}`);
    const authAdapter = new NullAuthAdapter();
    const currentClientId = authAdapter.getClientId();
    setClientId(currentClientId);

    const npcId = 'npc-player-id';
    setOpponentId(npcId);

    const setupMatch = async () => {
      console.log('setupMatch() started.');
      const fetchedCardTemplates = await fetchCardTemplates('v1');
      const filteredCardTemplates = Object.fromEntries(
        Object.entries(fetchedCardTemplates).filter(([id, template]) => template.templateId !== 'GAIN_FUNDS')
      );
      setCardTemplates(filteredCardTemplates);

      let loadedPlayerDeck: Deck | null = null;
      if (selectedDeckId) {
        try {
          loadedPlayerDeck = await getDeck(selectedDeckId);
          setPlayerDeck(loadedPlayerDeck);
          console.log('Player deck loaded successfully.', loadedPlayerDeck);
        } catch (error) {
          console.error('Failed to load player deck:', error);
        }
      } else {
        console.warn('No selectedDeckId found. Please select a deck.');
        setHasRequiredDecks(false);
        return;
      }

      let loadedNpcDeck: Deck | null = null;
      try {
        const response = await fetch('/decks/npc_default_deck.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        loadedNpcDeck = await response.json();
        setNpcDeck(loadedNpcDeck);
        console.log('NPC deck loaded successfully.', loadedNpcDeck);
      } catch (error) {
        console.error('Failed to load NPC default deck:', error);
      }

      if (!loadedPlayerDeck || !loadedNpcDeck) {
        console.error('Missing player or NPC deck. Cannot start game.');
        setHasRequiredDecks(false);
        return;
      }
      setHasRequiredDecks(true);

      const currentMatchId = await createMatch();
      setMatchId(currentMatchId);

      const unsubscribeState = watchGameState(currentMatchId, (dbGameState) => {
        if (dbGameState) {
          engineRef.current = new GameEngine(dbGameState, fetchedCardTemplates);
          setGameState(dbGameState);
          const currentPlayerState = dbGameState.players.find((p: PlayerState) => p.playerId === currentClientId);
          if (currentPlayerState) {
            setPlayerHand(currentPlayerState.hand);
          }
          if (gameRef.current && isPhaserReady) { // Add isPhaserReady check here
            console.log('GameView: Setting lastActions to Phaser Registry:', dbGameState.lastActions);
            gameRef.current.registry.set('lastActions', dbGameState.lastActions);

            // Get MainGameScene instance and call displayTurnActions directly
            const mainGameScene = gameRef.current.scene.get('MainGameScene') as MainGameScene;
            if (mainGameScene) {
              mainGameScene.displayTurnActions(dbGameState.lastActions);
            }
          }
        }
      });

      const unsubscribeActions = watchActions(currentMatchId, async (actions) => {
        if (isResolvingTurnRef.current) return;
        isResolvingTurnRef.current = true;
        try {
          if (engineRef.current?.getState().phase === 'GAME_OVER') return;
          const player1Action = actions[currentClientId];
          const player2Action = actions[npcId];
          if (!player1Action || !player2Action) return;
          if (engineRef.current) {
            const newGameState = engineRef.current.applyAction(player1Action, player2Action);
            await writeState(currentMatchId, newGameState);
          }
        } finally {
          isResolvingTurnRef.current = false;
        }
      });

      return () => {
        unsubscribeState();
        unsubscribeActions();
      };
    };

    console.log('Checking if selectedDeckId exists...');
    if (selectedDeckId) {
      console.log('Condition met. Calling setupMatch().');
      setupMatch();
    }
  }, [selectedDeckId]);

  useEffect(() => {
    if (phaserContainerRef.current && !gameRef.current) {
      const gameInstance = launch(phaserContainerRef.current);
      gameRef.current = gameInstance;
      setIsPhaserReady(true);

      gameInstance.events.on('startGame', async () => {
        console.log('Phaser event: startGame received.');
        setGameStarted(true);

        console.log('Preparing to create initial game state...', { clientId, opponentId, playerDeck, npcDeck });
        if (clientId && opponentId && Object.keys(cardTemplates).length > 0 && playerDeck && npcDeck) {
          const initialGameState = GameEngine.createInitialState(clientId, opponentId, cardTemplates, playerDeck, npcDeck);
          console.log('Initial game state created:', JSON.parse(JSON.stringify(initialGameState)));
          
          engineRef.current = new GameEngine(initialGameState, cardTemplates);
          
          const gameStateWithInitialHand = engineRef.current.advanceTurn();
          console.log('Game state after advancing first turn (hands dealt):', JSON.parse(JSON.stringify(gameStateWithInitialHand)));

          if (matchId) {
            await writeState(matchId, gameStateWithInitialHand);
            console.log('Initial game state written to DB.');
          }
        } else {
          console.error('Cannot start game: Missing critical data.', {
            clientId: !!clientId,
            opponentId: !!opponentId,
            cardTemplates: Object.keys(cardTemplates).length > 0,
            playerDeck: !!playerDeck,
            npcDeck: !!npcDeck,
          });
        }
      });
    }

    return () => {
      if (gameRef.current && gameRef.current.isBooted) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [clientId, opponentId, cardTemplates, matchId, hasRequiredDecks, playerDeck, npcDeck]);

  useEffect(() => {
    if (gameRef.current && matchId) {
      const handleAnimationComplete = async () => {
        if (engineRef.current && matchId) {
          const currentState = engineRef.current.getState();
          if (currentState.phase !== 'RESOLUTION' && currentState.phase !== 'GAME_OVER') {
            return;
          }
          if (currentState.phase === 'GAME_OVER') {
            if (!isGameOverHandledRef.current) {
              isGameOverHandledRef.current = true;
              const playerState = engineRef.current.getState().players.find(p => p.playerId === clientId);
              const message = playerState && playerState.properties > 0 ? 'You Win!' : 'You Lose!';
              const isWin = playerState && playerState.properties > 0;
              gameRef.current.events.emit('gameOver', message, isWin);
            }
            return;
          }
          const nextTurnState = engineRef.current.advanceTurn();
          // Explicitly clear lastActions before writing to DB
          nextTurnState.lastActions = [];
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
    if (gameRef.current && gameState && clientId) { // cardTemplates は setupMatch で設定済み
      gameRef.current.registry.set('gameState', gameState);
      gameRef.current.registry.set('clientId', clientId);
    }
  }, [gameState, clientId]);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleCardSelect = (action: Action | null) => {
    if (action === null) {
      setSelectedCardId(null);
    } else if (action.actionType === 'play_card') {
      setSelectedCardId(action.cardId || null);
    } else if (action.actionType === 'collect_funds') {
      setSelectedCardId('COLLECT_FUNDS');
    }
  };

  const handlePlayTurn = async () => {
    if (gameState?.phase === 'GAME_OVER' || !engineRef.current || !gameState || !matchId || !clientId || !opponentId) return;

    // 1. Determine Player's Action
    let player1Action: Action | null = null;
    if (selectedCardId) {
      if (selectedCardId === 'COLLECT_FUNDS') {
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
