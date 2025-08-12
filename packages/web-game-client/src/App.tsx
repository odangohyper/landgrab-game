// packages/web-game-client/src/App.tsx

import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from './game/engine';
import { GameState, PlayerState, Card, Action } from './types';
import HandView from './components/HandView';
import { launch } from './game/PhaserGame';
import { createMatch, putAction, watchActions, writeState, watchGameState } from './api/realtimeClient';
import { NullAuthAdapter } from './auth/NullAuthAdapter';
import './App.css';

function App() {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null); // For NPC or other player

  // Use useRef to hold the engine instance across renders without re-initializing
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    // Initialize AuthAdapter and get clientId
    const authAdapter = new NullAuthAdapter();
    const currentClientId = authAdapter.getClientId();
    setClientId(currentClientId);

    // For single player vs NPC, we'll use a fixed opponent ID for now
    const npcId = 'npc-player-id';
    setOpponentId(npcId);

    // Try to create or join a match
    const setupMatch = async () => {
      let currentMatchId = localStorage.getItem('currentMatchId'); // Try to resume
      if (!currentMatchId) {
        currentMatchId = await createMatch();
        localStorage.setItem('currentMatchId', currentMatchId);
      }
      setMatchId(currentMatchId);

      // Initialize GameEngine with initial state if it's a new match
      // Or load state from DB if resuming (will be handled by watchState)
      if (!engineRef.current) {
        const initialGameState = GameEngine.createInitialState(currentClientId, npcId);
        engineRef.current = new GameEngine(initialGameState);
        setGameEngine(engineRef.current);
        await writeState(currentMatchId, initialGameState); // Write initial state to DB
      }

      // Watch game state from Realtime Database
      const unsubscribeState = watchGameState(currentMatchId, (dbGameState) => {
        setGameState(dbGameState);
        // Update player hand based on the latest game state from DB
        const currentPlayerState = dbGameState.players.find((p: PlayerState) => p.playerId === currentClientId);
        if (currentPlayerState) {
          setPlayerHand(currentPlayerState.hand);
        }
      });

      // Watch actions from Realtime Database
      const unsubscribeActions = watchActions(currentMatchId, async (actions) => {
        // Check if both players have submitted actions
        const player1Action = actions[currentClientId];
        const player2Action = actions[npcId];

        if (player1Action && player2Action) {
          console.log('Both players submitted actions. Resolving turn...');
          if (engineRef.current) {
            // Advance turn (funds, draw)
            let newGameState = engineRef.current.advanceTurn();
            // Apply actions and resolve turn
            newGameState = engineRef.current.applyAction(player1Action, player2Action);
            await writeState(currentMatchId, newGameState); // Write updated state to DB
            // Clear actions from DB after resolution
            await set(ref(database, `matches/${currentMatchId}/actions`), {});
          }
        }
      });

      // Launch Phaser game
      const game = launch('phaser-game-container');

      return () => {
        // Clean up Phaser game and DB listeners when component unmounts
        game.destroy(true);
        unsubscribeState();
        unsubscribeActions();
      };
    };

    setupMatch();
  }, []);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  const handlePlayTurn = async () => { // Make it async
    if (gameEngine && gameState && matchId && clientId && opponentId) {
      // Player's action
      const player1Action: Action | null = selectedCardId ? { playerId: clientId, cardId: selectedCardId } : null;

      // Simulate NPC action (for now, just pick a random card if available)
      const npcPlayerState = gameState.players.find(p => p.playerId === opponentId);
      let player2Action: Action | null = null;
      if (npcPlayerState && npcPlayerState.hand.length > 0) {
        // Simple random choice for NPC
        const randomCard = npcPlayerState.hand[Math.floor(Math.random() * npcPlayerState.hand.length)];
        player2Action = { playerId: opponentId, cardId: randomCard.id };
      }

      // Write player's action to DB
      if (player1Action) {
        await putAction(matchId, clientId, player1Action);
      }
      // Write NPC's action to DB (simulated)
      if (player2Action) {
        await putAction(matchId, opponentId, player2Action);
      }

      setSelectedCardId(null); // Clear selected card after playing
    }
  };

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  const currentPlayerState = gameState.players.find(p => p.playerId === 'player1-id');
  const playableCardIds: string[] = [];
  if (currentPlayerState && gameEngine) {
    currentPlayerState.hand.forEach(card => {
      const cardTemplate = gameEngine.getCardTemplate(card.templateId);
      if (cardTemplate && currentPlayerState.funds >= cardTemplate.cost) {
        playableCardIds.push(card.id);
      }
    });
  }

  return (
    <div className="App">
      <h1>鹿王院エリザベスの地上げですわ！</h1>
      <div style={{ marginBottom: '20px' }}>
        <p>Turn: {gameState.turn}</p>
        <p>Phase: {gameState.phase}</p>
        <button onClick={handlePlayTurn} disabled={!selectedCardId}>Play Turn</button> {/* Disable if no card selected */}
      </div>

      {currentPlayerState && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Player: {currentPlayerState.playerId}</h2>
          <p>Funds: {currentPlayerState.funds}</p>
          <p>Properties: {currentPlayerState.properties}</p>
        </div>
      )}

      <HandView hand={playerHand} onCardSelect={handleCardSelect} playableCardIds={playableCardIds} />

      {/* Phaser game container */}
      <div id="phaser-game-container" style={{ width: '800px', height: '600px', margin: '20px auto', border: '1px solid white' }}></div>

      {/* Add game controls and other UI elements here */}
    </div>
  );
}

export default App;
