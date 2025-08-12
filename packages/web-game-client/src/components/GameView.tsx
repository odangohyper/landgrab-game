// packages/web-game-client/src/components/GameView.tsx

import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { GameState, PlayerState, Card, Action } from '../types';
import HandView from './HandView';
import { launch } from '../game/PhaserGame';
import { createMatch, putAction, watchActions, writeState, watchGameState, fetchCardTemplates } from '../api/realtimeClient';
import { NullAuthAdapter } from '../auth/NullAuthAdapter';
import { database } from '../firebaseConfig'; // Import database for set(ref(...))
import { ref, set } from 'firebase/database'; // Import ref and set for clearing actions

interface GameViewProps {
  // Props will be added later if needed, e.g., onGameEnd
}

const GameView: React.FC<GameViewProps> = () => {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [cardTemplates, setCardTemplates] = useState<{ [templateId: string]: CardTemplate }>({}); // New state for card templates

  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const authAdapter = new NullAuthAdapter();
    const currentClientId = authAdapter.getClientId();
    setClientId(currentClientId);

    const npcId = 'npc-player-id';
    setOpponentId(npcId);

    const setupMatch = async () => {
      // Fetch card templates first
      const fetchedCardTemplates = await fetchCardTemplates('v1'); // Assuming 'v1' version
      setCardTemplates(fetchedCardTemplates);

      let currentMatchId = localStorage.getItem('currentMatchId');
      if (!currentMatchId) {
        currentMatchId = await createMatch();
        localStorage.setItem('currentMatchId', currentMatchId);
      }
      setMatchId(currentMatchId);

      if (!engineRef.current) {
        const initialGameState = GameEngine.createInitialState(currentClientId, npcId);
        engineRef.current = new GameEngine(initialGameState);
        // Advance turn once to draw initial hands
        const gameStateWithInitialHand = engineRef.current.advanceTurn();
        setGameEngine(engineRef.current);
        await writeState(currentMatchId, gameStateWithInitialHand);
      }

      const unsubscribeState = watchGameState(currentMatchId, (dbGameState) => {
        setGameState(dbGameState);
        const currentPlayerState = dbGameState.players.find((p: PlayerState) => p.playerId === currentClientId);
        if (currentPlayerState) {
          setPlayerHand(currentPlayerState.hand);
        }
      });

      const unsubscribeActions = watchActions(currentMatchId, async (actions) => {
        const player1Action = actions[currentClientId];
        const player2Action = actions[npcId];

        if (player1Action && player2Action) {
          console.log('Both players submitted actions. Resolving turn...');
          if (engineRef.current) {
            let newGameState = engineRef.current.advanceTurn();
            newGameState = engineRef.current.applyAction(player1Action, player2Action);
            await writeState(currentMatchId, newGameState);
            await set(ref(database, `matches/${currentMatchId}/actions`), {});
          }
        }
      });

      const game = launch('phaser-game-container');

      return () => {
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

  const handlePlayTurn = async () => {
    if (gameEngine && gameState && matchId && clientId && opponentId) {
      const player1Action: Action | null = selectedCardId ? { playerId: clientId, cardId: selectedCardId } : null;

      const npcPlayerState = gameState.players.find(p => p.playerId === opponentId);
      let player2Action: Action | null = null;
      if (npcPlayerState && npcPlayerState.hand.length > 0) {
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
    <div className="GameView">
      <h1>鹿王院エリザベスの地上げですわ！</h1>
      <div style={{ marginBottom: '20px' }}>
        <p>Turn: {gameState.turn}</p>
        <p>Phase: {gameState.phase}</p>
        <button onClick={handlePlayTurn} disabled={!selectedCardId}>Play Turn</button>
      </div>

      {currentPlayerState && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Player: {currentPlayerState.playerId}</h2>
          <p>Funds: {currentPlayerState.funds}</p>
          <p>Properties: {currentPlayerState.properties}</p>
        </div>
      )}

      <HandView hand={playerHand} onCardSelect={handleCardSelect} playableCardIds={playableCardIds} cardTemplates={cardTemplates} />

      <div id="phaser-game-container" style={{ width: '800px', height: '600px', margin: '20px auto', border: '1px solid white' }}></div>
    </div>
  );
};

export default GameView;
