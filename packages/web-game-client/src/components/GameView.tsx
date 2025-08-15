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
import { choose_card } from '../game/ai/ai'; // Import choose_card

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

  const engineRef = useRef<GameEngine | null>(null);
  const phaserContainerRef = useRef<HTMLDivElement>(null); // Ref for the Phaser container div
  const gameRef = useRef<Phaser.Game | null>(null); // Ref to hold the Phaser game instance
  const isResolvingTurnRef = useRef(false); // Mutex to prevent double resolution

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

      if (!engineRef.current && Object.keys(fetchedCardTemplates).length > 0) {
        const initialGameState = GameEngine.createInitialState(currentClientId, npcId, fetchedCardTemplates);
        engineRef.current = new GameEngine(initialGameState, fetchedCardTemplates);
        const gameStateWithInitialHand = engineRef.current.advanceTurn();
        await writeState(currentMatchId, gameStateWithInitialHand);
      }

      const unsubscribeState = watchGameState(currentMatchId, (dbGameState) => {
        if (dbGameState) {
          if (engineRef.current) {
            engineRef.current = new GameEngine(dbGameState, fetchedCardTemplates);
          }
          setGameState(dbGameState);
          const currentPlayerState = dbGameState.players.find((p: PlayerState) => p.playerId === currentClientId);
          if (currentPlayerState) {
            setPlayerHand(currentPlayerState.hand);
          }
        }
      });

      const unsubscribeActions = watchActions(currentMatchId, async (actions) => {
        // Mutexをコールバックの最初に移動
        if (isResolvingTurnRef.current) {
            console.log('Mutex: Already locked, skipping duplicate trigger.');
            return;
        }
        isResolvingTurnRef.current = true; // 処理開始時にロック
        console.log('Mutex: Locked.'); // ロックされたことをログ出力

        try { // try-finally で確実にロックを解除
            if (engineRef.current?.getState().phase === 'GAME_OVER') {
                console.log('Mutex: Game is over, skipping action resolution. (Early exit)');
                return;
            }

            const player1Action = actions[currentClientId];
            const player2Action = actions[npcId];

            console.log('watchActions: Player1 Action:', player1Action); // 追加ログ
            console.log('watchActions: Player2 Action:', player2Action); // 追加ログ

            // 両方のアクションが揃っていることをMutexの保護下で厳密にチェック
            if (player1Action && player2Action) {
              console.log('Mutex: Both players submitted actions. Resolving turn...');
              if (engineRef.current) {
                console.log('watchActions: Calling applyAction...'); // 追加ログ
                const newGameState = engineRef.current.applyAction(player1Action, player2Action);
                console.log('watchActions: applyAction returned newGameState:', newGameState); // 追加ログ
                await writeState(currentMatchId, newGameState);
                console.log('watchActions: writeState completed.'); // 追加ログ
              }
            } else {
                // アクションが揃っていない場合は、ロックを解除して何もしない
                console.log('Mutex: Actions not yet complete, waiting for opponent. (Early exit)');
                return;
            }
        } finally {
            isResolvingTurnRef.current = false; // 処理終了時にロック解除
            console.log('Mutex: Unlocked.'); // ロックが解除されたことをログ出力
        }
      });

      return () => {
        unsubscribeState();
        unsubscribeActions();
      };
    };

    setupMatch();
  }, []);

  // Effect to launch Phaser game when container ref is available
  useEffect(() => {
    if (phaserContainerRef.current && !gameRef.current) {
      gameRef.current = launch(phaserContainerRef.current);
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [phaserContainerRef.current]);

  const isGameOverHandledRef = useRef(false); // 新しいRefを追加

  // Effect to listen for Phaser animation completion and advance turn
  useEffect(() => {
    if (gameRef.current && matchId) {
      const handleAnimationComplete = async () => {
        if (engineRef.current && matchId) {
          const currentState = engineRef.current.getState();
          if (currentState.phase !== 'RESOLUTION' && currentState.phase !== 'GAME_OVER') {
            console.log(`handleAnimationComplete: Skipped because phase is not RESOLUTION or GAME_OVER (it is ${currentState.phase}).`);
            return;
          }

          // Check if game is over AFTER animation
          if (currentState.phase === 'GAME_OVER') {
            if (!isGameOverHandledRef.current) { // 一度だけ処理
              isGameOverHandledRef.current = true;
              console.log('Game is over after animation. Not advancing turn. Emitting gameOver event.'); // 追加ログ
              // Notify Phaser to display game over message
              const playerState = engineRef.current.getState().players.find(p => p.playerId === clientId);
              const message = playerState && playerState.properties > 0 ? 'You Win!' : 'You Lose!';
              const isWin = playerState && playerState.properties > 0;
              gameRef.current.events.emit('gameOver', message, isWin);
            } else {
              console.log('Game is over, but gameOver event already handled.'); // 追加ログ
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
  }, [gameRef.current, matchId, clientId]); // clientId を依存配列に追加

  // Effect to sync React's gameState to Phaser's registry
  useEffect(() => {
    if (gameRef.current && gameState && Object.keys(cardTemplates).length > 0 && clientId) {
      gameRef.current.registry.set('gameState', gameState);
      gameRef.current.registry.set('cardTemplates', cardTemplates);
      gameRef.current.registry.set('clientId', clientId);

      // If lastActions exists in the new state, explicitly set it.
      // This triggers the 'changedata-lastActions' event in Phaser.
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
        // Use choose_card for NPC action
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

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  const currentPlayerState = gameState.players.find(p => p.playerId === clientId);
  const opponentState = gameState.players.find(p => p.playerId !== clientId);
  const playableCardIds: string[] = [];
  if (currentPlayerState && engineRef.current) {
    currentPlayerState.hand.forEach(card => {
      const cardTemplate = engineRef.current!.getCardTemplate(card.templateId);
      if (cardTemplate && currentPlayerState.funds >= cardTemplate.cost) {
        playableCardIds.push(card.id);
      }
    });
  }

  return (
    <div className="game-container">
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

      <div className="main-area">
        <div id="phaser-game-container" ref={phaserContainerRef}></div>
      </div>

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
    </div>
  );
};

export default GameView;