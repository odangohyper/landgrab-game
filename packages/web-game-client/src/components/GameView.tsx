// packages/web-game-client/src/components/GameView.tsx

import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { GameState, PlayerState, Card, Action, CardTemplate } from '../types';
import HandView from './HandView';
import { launch } from '../game/PhaserGame';
import { createMatch, putAction, watchActions, writeState, watchGameState, fetchCardTemplates } from '../api/realtimeClient';
import { NullAuthAdapter } from '../auth/NullAuthAdapter';
import { database } from '../firebaseConfig';
import { ref, set } from 'firebase/database';
import Phaser from 'phaser';

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

      let currentMatchId = localStorage.getItem('currentMatchId');
      if (!currentMatchId) {
        currentMatchId = await createMatch();
        localStorage.setItem('currentMatchId', currentMatchId);
      }
      setMatchId(currentMatchId);

      if (!engineRef.current && Object.keys(fetchedCardTemplates).length > 0) {
        const initialGameState = GameEngine.createInitialState(currentClientId, npcId, fetchedCardTemplates);
        engineRef.current = new GameEngine(initialGameState, fetchedCardTemplates);
        const gameStateWithInitialHand = engineRef.current.advanceTurn();
        // setGameEngine(engineRef.current); // No longer need state for engine
        await writeState(currentMatchId, gameStateWithInitialHand);
      }

      const unsubscribeState = watchGameState(currentMatchId, (dbGameState) => {
        if (dbGameState) {
          // When gameState updates from DB, ensure engine is also in sync
          if (engineRef.current) {
            engineRef.current = new GameEngine(dbGameState, fetchedCardTemplates);
          }
          setGameState(dbGameState);
          const currentPlayerState = dbGameState.players.find((p: PlayerState) => p.playerId === currentClientId);
          if (currentPlayerState) {
            setPlayerHand(currentPlayerState.hand);
          }

          // Explicitly set lastActions to Phaser registry if available
          if (gameRef.current && dbGameState.lastActions) {
            gameRef.current.registry.set('lastActions', dbGameState.lastActions);
          }
        }
      });

      const unsubscribeActions = watchActions(currentMatchId, async (actions) => {
        if (engineRef.current?.getState().phase === 'GAME_OVER' || isResolvingTurnRef.current) return;

        const player1Action = actions[currentClientId];
        const player2Action = actions[npcId];

        if (player1Action && player2Action) {
          isResolvingTurnRef.current = true;
          console.log('Both players submitted actions. Resolving turn...');
          if (engineRef.current) {
            // The engine's state is already updated by watchGameState. Now, apply actions.
            let newGameState = engineRef.current.applyAction(player1Action, player2Action);
            // Explicitly set lastActions to Phaser registry before writing to DB
            if (gameRef.current && newGameState.lastActions) {
              gameRef.current.registry.set('lastActions', newGameState.lastActions);
            }
            await writeState(currentMatchId, newGameState);
            
            // After writing the state with lastActions, wait a bit for Phaser to render
            // Then advance to the next turn
            setTimeout(async () => {
              newGameState = engineRef.current!.advanceTurn();
              await writeState(currentMatchId, newGameState);
              // Clear actions for the next turn
              await set(ref(database, `matches/${currentMatchId}/actions`), {});
            }, 2000); // Wait 2 seconds before advancing turn and clearing actions
          }
          isResolvingTurnRef.current = false;
        }
      });

      // Phaser launch logic moved to a separate useEffect

      return () => {
        unsubscribeState();
        unsubscribeActions();
      };
    };

    setupMatch();
    
    return () => {
        // gameRef.current?.destroy(true); // Destroy logic moved to separate useEffect
        // gameRef.current = null;
    }
  }, []);

  // Effect to launch Phaser game when container ref is available
  useEffect(() => {
    if (phaserContainerRef.current && !gameRef.current) {
      gameRef.current = launch(phaserContainerRef.current); // Pass the actual DOM element
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [phaserContainerRef.current]);

  useEffect(() => {
    if (gameRef.current && gameState && Object.keys(cardTemplates).length > 0 && clientId) {
      gameRef.current.registry.set('gameState', gameState);
      gameRef.current.registry.set('cardTemplates', cardTemplates);
      gameRef.current.registry.set('clientId', clientId);
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
        // Simple AI: play a random card
        const randomCard = npcPlayerState.hand[Math.floor(Math.random() * npcPlayerState.hand.length)];
        player2Action = { playerId: opponentId, cardId: randomCard.id };
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
          <h2>Opponent</h2>
          <p>Funds: {opponentState.funds}</p>
          <p>Properties: {opponentState.properties}</p>
        </div>
      )}

      {/* Player HUD */}
      {currentPlayerState && (
        <div className="hud player-hud">
          <h2>Player: You</h2>
          <p>Funds: {currentPlayerState.funds}</p>
          <p>Properties: {currentPlayerState.properties}</p>
        </div>
      )}

      <div className="main-area">
        <div id="phaser-game-container" ref={phaserContainerRef}></div>
      </div>

      <div className="player-area">
        <HandView hand={playerHand} onCardSelect={handleCardSelect} playableCardIds={playableCardIds} cardTemplates={cardTemplates} selectedCardId={selectedCardId} />

        <div className="action-bar">
          {gameState.phase !== 'GAME_OVER' && (
            <button onClick={handlePlayTurn} disabled={!selectedCardId} className="play-button">
              Play Turn
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameView;
