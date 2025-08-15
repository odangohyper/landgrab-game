import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { MainGameScene } from '../game/scenes/MainGameScene';
import { GameState, PlayerState, Card, Action, CardTemplate } from '../types';
import HandView from './HandView';
import { launch } from '../game/PhaserGame';
import { createMatch, putAction, watchActions, writeState, watchGameState, fetchCardTemplates } from '../api/realtimeClient';
import { NullAuthAdapter } from '../auth/NullAuthAdapter';
import { database } from '../firebaseConfig';
import { ref, set } from 'firebase/database';
import Phaser from 'phaser';
import { choose_card } from '../game/ai/ai';

interface GameViewProps {
  // Props will be added later if needed, e.g., onGameEnd
}

const GameView: React.FC<GameViewProps> = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [cardTemplates, setCardTemplates] = useState<{ [templateId: string]: CardTemplate }>({});
  const [gameStarted, setGameStarted] = useState<boolean>(false); // New state for game start

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
      const fetchedCardTemplates = await fetchCardTemplates('v1');
      setCardTemplates(fetchedCardTemplates);

      const currentMatchId = await createMatch();
      setMatchId(currentMatchId);

      // Initial game state creation only after game starts from title screen
      // This part will be moved inside the startGame event listener

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

          console.log('watchActions: Player1 Action:', player1Action);
          console.log('watchActions: Player2 Action:', player2Action);

          if (player1Action && player2Action) {
            console.log('Mutex: Both players submitted actions. Resolving turn...');
            if (engineRef.current) {
              console.log('watchActions: Calling applyAction...');
              const newGameState = engineRef.current.applyAction(player1Action, player2Action);
              console.log('watchActions: applyAction returned newGameState:', newGameState);
              await writeState(currentMatchId, newGameState);
              console.log('watchActions: writeState completed.');
            }
          } else {
            console.log('Mutex: Actions not yet complete, waiting for opponent. (Early exit)');
            return;
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
  }, []); // Empty dependency array to run only once on mount

  // Effect to launch Phaser game when container ref is available

  useEffect(() => {
    console.log('Phaser useEffect: Running. phaserContainerRef.current:', phaserContainerRef.current, 'gameRef.current:', gameRef.current);

    // Only launch if container is available AND game is not already launched
    if (phaserContainerRef.current && !gameRef.current) {
      console.log('Phaser useEffect: Launching Phaser game.');
      const gameInstance = launch(phaserContainerRef.current);
      gameRef.current = gameInstance; // Assign to ref

      // Listen for startGame event from Phaser TitleScene
      gameInstance.events.on('startGame', async () => {
        console.log('startGame event received from Phaser! Setting gameStarted to true.');
        setGameStarted(true);

        // Initialize game state and advance turn here
        if (clientId && opponentId && Object.keys(cardTemplates).length > 0) {
          const initialGameState = GameEngine.createInitialState(clientId, opponentId, cardTemplates);
          engineRef.current = new GameEngine(initialGameState, cardTemplates);
          const gameStateWithInitialHand = engineRef.current.advanceTurn();
          if (matchId) { // Ensure matchId is available
            await writeState(matchId, gameStateWithInitialHand);
          }
        }
        // Transition to MainGameScene
        gameInstance?.scene.start('MainGameScene');
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
  }, [clientId, opponentId, cardTemplates, matchId]); // Correct dependencies

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

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  const handlePlayTurn = async () => {
    if (gameState?.phase === 'GAME_OVER') return;

    if (engineRef.current && gameState && matchId && clientId && opponentId) {
      const player1Action: Action | null = selectedCardId ? { playerId: clientId, cardId: selectedCardId } : null;

      const npcPlayerState = gameState.players.find(p => p.playerId === opponentId);
      let player2Action: Action | null = null;
      if (npcPlayerState && npcPlayerState.hand.length > 0) {
        const chosenCard = choose_card(gameState, npcPlayerState.hand, Date.now(), cardTemplates);
        if (chosenCard) {
          player2Action = { playerId: opponentId, cardId: chosenCard.id };
        }
      }

      if (player1Action) {
        await putAction(matchId, clientId, player1Action);
      }
      if (player2Action) {
        await putAction(matchId, opponentId, player2Action);
      }

      setSelectedCardId(null);
    }
  };

  // State variables for rendering UI
  const currentPlayerState = gameState?.players.find(p => p.playerId === clientId);
  const opponentState = gameState?.players.find(p => p.playerId === opponentId);
  const playableCardIds = currentPlayerState && engineRef.current
    ? engineRef.current.getPlayableCards(currentPlayerState).map(card => card.id)
    : [];

  return (
    <div className="game-container">
      <div id="phaser-game-container" ref={phaserContainerRef}></div>
      {gameStarted && gameState && (
        <>
          <div className="top-bar">
            <h1 className="game-title">鹿王院エリザベスの地上げですわ！</h1>
            <p className="turn-info">Turn: {gameState.turn}</p>
          </div>

          {/* Opponent HUD */}
          {opponentState && (
            <div className="hud opponent-hud">
              <h2>対戦相手</h2>
              <p>資金: {opponentState.funds}</p>
              <p>不動産: {opponentState.properties}</p>
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

          <div className="player-area">
            <div className="bottom-panel">
              <div className="game-log-area">
                <div className="log-entries">
                  {gameState.log.slice().reverse().map((entry, index) => (
                    <p key={index} className={index === 0 ? 'latest-log' : ''}>{entry}</p>
                  ))}
                </div>
              </div>
              <HandView hand={playerHand} onCardSelect={handleCardSelect} playableCardIds={playableCardIds} cardTemplates={cardTemplates} selectedCardId={selectedCardId} />

              <div className="action-bar">
                <button onClick={handlePlayTurn} disabled={!selectedCardId || gameState.phase === 'GAME_OVER'} className="play-button">
                  Play Turn
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {!gameStarted && (
        <div className={`loading-overlay ${!gameStarted ? 'visible' : ''}`}>
          <p>Loading game...</p>
        </div>
      )}
    </div>
  );
};

export default GameView;