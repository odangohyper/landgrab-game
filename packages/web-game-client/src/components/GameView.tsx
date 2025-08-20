import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { MainGameScene } from '../game/scenes/MainGameScene';
import { GameState, PlayerState, Card, Action, CardTemplate, Deck } from '../types';
import HandView from './HandView';
import DeckInfo from './DeckInfo';
import Modal from './Modal';
import { launch } from '../game/PhaserGame';
import { createMatch, writeState, watchMatchData, fetchCardTemplates } from '../api/realtimeClient';
import { NullAuthAdapter } from '../auth/NullAuthAdapter';
import { database } from '../firebaseConfig';
import { ref, set } from 'firebase/database';
import Phaser from 'phaser';
import { choose_card } from '../game/ai/ai';
import { getDeck } from '../api/deckApi';

interface GameViewProps {
  selectedDeckId: string | null;
}

const MAX_STACK_IMAGES = 6;
const STACK_OFFSET_X = 2;
const STACK_OFFSET_Y = 2;

const GameView: React.FC<GameViewProps> = ({ selectedDeckId }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [cardTemplates, setCardTemplates] = useState<{ [templateId: string]: CardTemplate }>({});
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isPhaserReady, setIsPhaserReady] = useState<boolean>(false);
  const [hasRequiredDecks, setHasRequiredDecks] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalContent, setModalContent] = useState<'deck' | 'discard' | null>(null);

  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const isResolvingTurnRef = useRef(false);

  useEffect(() => {
    const initializeGame = async () => {
      console.log("InitializeGame: Starting...");

      const authAdapter = new NullAuthAdapter();
      const currentClientId = authAdapter.getClientId();
      setClientId(currentClientId);
      const npcId = 'npc-player-id';
      setOpponentId(npcId);

      if (!selectedDeckId) {
        console.warn('InitializeGame: No deck selected.');
        setHasRequiredDecks(false);
        setIsPhaserReady(true);
        return;
      }

      console.log("InitializeGame: Fetching required data...");
      const fetchedCardTemplates = await fetchCardTemplates();
      setCardTemplates(fetchedCardTemplates);

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
      setHasRequiredDecks(true);
      console.log("InitializeGame: All data fetched and set.");

      if (phaserContainerRef.current && !gameRef.current) {
        console.log("InitializeGame: Launching Phaser...");
        const gameInstance = launch(phaserContainerRef.current, fetchedCardTemplates);
        gameRef.current = gameInstance;
        setIsPhaserReady(true);
        gameInstance.registry.set('clientId', currentClientId);

        const currentMatchId = await createMatch();
        setMatchId(currentMatchId);

        const initialGameState = GameEngine.createInitialState(currentClientId, npcId, fetchedCardTemplates, loadedPlayerDeck, loadedNpcDeck);
        engineRef.current = new GameEngine(initialGameState, fetchedCardTemplates);

        watchMatchData(currentMatchId, async (data) => {
          const { state: dbGameState, actions } = data;
          if (!dbGameState || !engineRef.current) return;

          engineRef.current.setState(dbGameState);
          setGameState(dbGameState);
          const currentPlayerState = dbGameState.players.find((p) => p.playerId === currentClientId);
          if (currentPlayerState) setPlayerHand(currentPlayerState.hand);

          const playerAction = actions ? actions[currentClientId] : undefined;
          const opponentAction = actions ? actions[npcId] : undefined;

          if (playerAction && opponentAction && dbGameState.phase === 'ACTION') {
            console.log('WATCH: Both actions found, applying...');
            // ここで engine を生成する際に fetchedCardTemplates を使う
            const engineForApply = new GameEngine(dbGameState, fetchedCardTemplates);
            const newState = engineForApply.applyAction(playerAction, opponentAction);
            await writeState(currentMatchId, newState);
            return;
          }

          if (dbGameState.phase === 'RESOLUTION' && !isResolvingTurnRef.current) {
            isResolvingTurnRef.current = true;
            console.log('WATCH: State is RESOLUTION, starting animation...');

            gameRef.current?.registry.set('lastActions', dbGameState.lastActions);
            // Direct call to MainGameScene's displayTurnActions
            const mainGameScene = gameRef.current?.scene.getScene('MainGameScene') as MainGameScene;
            if (mainGameScene) {
              mainGameScene.displayTurnActions(dbGameState.lastActions);
            }

            await new Promise<void>(resolve => gameRef.current?.events.once('animationComplete', () => resolve()));
            console.log('WATCH: Animation complete.');

            if (dbGameState.result !== 'IN_PROGRESS') {
              console.log('WATCH: Game is over, displaying result.');
              let message: string;
              let isWin: boolean = false;
              const playerIsP1 = dbGameState.players[0].playerId === currentClientId;
              const result = playerIsP1 ? dbGameState.result : 
                             dbGameState.result === 'WIN' ? 'LOSE' : 
                             dbGameState.result === 'LOSE' ? 'WIN' : 'DRAW';

              switch (result) {
                case 'WIN': message = 'You Win!'; isWin = true; break;
                case 'LOSE': message = 'You Lose!'; break;
                case 'DRAW': message = 'Draw!'; break;
                default: message = 'Game Over (Unknown Result)'; break;
              }
              gameRef.current?.events.emit('gameOver', message, isWin);
            } else {
              console.log('WATCH: Game not over, advancing turn.');
              // ここで engine を生成する際に fetchedCardTemplates を使う
              const engineForAdvance = new GameEngine(dbGameState, fetchedCardTemplates);
              const nextTurnState = engineForAdvance.advanceTurn();
              // First, clear the actions to prevent re-triggering the resolution.
              await set(ref(database, `matches/${currentMatchId}/actions`), null);
              // Then, write the new state for the next turn.
              await writeState(currentMatchId, nextTurnState);
            }

            isResolvingTurnRef.current = false;
            return;
          }
        });

        console.log("InitializeGame: Writing initial state...");
        const gameStateWithInitialHand = engineRef.current.advanceTurn();
        await writeState(currentMatchId, gameStateWithInitialHand);
        setGameStarted(true);
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
      setSelectedCardId('COLLECT_FUNDS');
    }
  };

  const handlePlayTurn = async () => {
    if (gameState?.phase !== 'ACTION' || !matchId || !clientId || !opponentId) return;

    let player1Action: Action | null = null;
    if (selectedCardId) {
      if (selectedCardId === 'COLLECT_FUNDS') {
        player1Action = { playerId: clientId, actionType: 'collect_funds', cardId: 'COLLECT_FUNDS' };
      } else {
        player1Action = { playerId: clientId, actionType: 'play_card', cardId: selectedCardId };
      }
    }

    if (!player1Action) {
        console.warn('handlePlayTurn: Player action is null, aborting.');
        return;
    }

    const npcPlayerState = gameState.players.find(p => p.playerId === opponentId);
    let player2Action: Action | null = null;
    if (npcPlayerState && gameState) {
      player2Action = choose_card(gameState, npcPlayerState.hand, Date.now(), cardTemplates);
    }

    if (!player2Action) {
        console.log('NPC action was null, defaulting to collect_funds.');
        player2Action = { playerId: opponentId!, actionType: 'collect_funds', cardId: 'COLLECT_FUNDS' };
    }

    const actionsToSubmit: { [key: string]: Action } = {
      [clientId]: player1Action,
      [opponentId]: player2Action,
    };

    await set(ref(database, `matches/${matchId}/actions`), actionsToSubmit);
    setSelectedCardId(null);
  };

  const currentPlayerState = gameState?.players.find(p => p.playerId === clientId);
  const opponentState = gameState?.players.find(p => p.playerId === opponentId);
  const playableCardIds = currentPlayerState && gameState && cardTemplates
    ? new GameEngine(gameState, cardTemplates).getPlayableCards(currentPlayerState).map(card => card.id)
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
                className={`action-card-item ${selectedCardId === 'COLLECT_FUNDS' ? 'selected' : ''}`}
                onClick={() => {
                  if (selectedCardId === 'GAIN_FUNDS') {
                    handleCardSelect(null);
                  } else {
                    handleCardSelect({ playerId: clientId, actionType: 'collect_funds' });
                  }
                }}
              >
                <p className="action-card-name">資金集め</p>
              </div>
              <button onClick={handlePlayTurn} disabled={!selectedCardId || (gameState?.phase !== 'ACTION')} className="play-button">
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