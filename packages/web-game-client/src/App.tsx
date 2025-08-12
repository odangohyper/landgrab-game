// packages/web-game-client/src/App.tsx

import React, { useState, useEffect } from 'react';
import { GameEngine } from './game/engine';
import { GameState, PlayerState, Card } from './types';
import HandView from './components/HandView';
import { launch } from './game/PhaserGame'; // Import launch function
import './App.css'; // Keep basic styling

function App() {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);

  useEffect(() => {
    // Initialize game engine and state
    const player1Id = 'player1-id'; // This would come from AuthAdapter in a real scenario
    const player2Id = 'player2-id'; // NPC ID
    const initialGameState = GameEngine.createInitialState(player1Id, player2Id);
    const engine = new GameEngine(initialGameState);

    setGameEngine(engine);
    setGameState(engine.getState());

    // Simulate drawing initial hand (for player1)
    // In a real game, this would be part of turn logic
    const currentPlayerState = initialGameState.players.find(p => p.playerId === player1Id);
    if (currentPlayerState) {
      // For demonstration, let's just take first 3 cards from deck as hand
      const hand = currentPlayerState.deck.splice(0, 3);
      setPlayerHand(hand);
      // Update game state with new hand and deck
      const updatedPlayers = initialGameState.players.map(p =>
        p.playerId === player1Id ? { ...p, hand: hand, deck: currentPlayerState.deck } : p
      );
      setGameState({ ...initialGameState, players: updatedPlayers });
    }

    // Launch Phaser game
    const game = launch('phaser-game-container');
    return () => {
      // Clean up Phaser game when component unmounts
      game.destroy(true);
    };

  }, []);

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  const currentPlayerState = gameState.players.find(p => p.playerId === 'player1-id');

  return (
    <div className="App">
      <h1>鹿王院エリザベスの地上げですわ！</h1>
      <div style={{ marginBottom: '20px' }}>
        <p>Turn: {gameState.turn}</p>
        <p>Phase: {gameState.phase}</p>
      </div>

      {currentPlayerState && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Player: {currentPlayerState.playerId}</h2>
          <p>Funds: {currentPlayerState.funds}</p>
          <p>Properties: {currentPlayerState.properties}</p>
        </div>
      )}

      <HandView hand={playerHand} />

      {/* Phaser game container */}
      <div id="phaser-game-container" style={{ width: '800px', height: '600px', margin: '20px auto', border: '1px solid white' }}></div>

      {/* Add game controls and other UI elements here */}
    </div>
  );
}

export default App;
