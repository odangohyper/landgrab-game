// packages/web-game-client/src/game/engine.test.ts

import { GameState, PlayerState, Action, Card } from '../types';
import { GameEngine } from './engine';

describe('GameEngine', () => {
  let initialState: GameState;
  let engine: GameEngine;

  beforeEach(() => {
    initialState = GameEngine.createInitialState('player1-id', 'player2-id');
    engine = new GameEngine(initialState);
  });

  it('should create an initial game state correctly', () => {
    const state = engine.getState();
    expect(state.matchId).toBeDefined();
    expect(state.turn).toBe(0);
    expect(state.phase).toBe('DRAW');
    expect(state.players.length).toBe(2);

    const player1 = state.players.find(p => p.playerId === 'player1-id');
    const player2 = state.players.find(p => p.playerId === 'player2-id');

    expect(player1).toBeDefined();
    expect(player1?.funds).toBe(2);
    expect(player1?.properties).toBe(1);
    expect(player1?.deck.length).toBeGreaterThan(0); // Deck should not be empty

    expect(player2).toBeDefined();
    expect(player2?.funds).toBe(2);
    expect(player2?.properties).toBe(1);
    expect(player2?.deck.length).toBeGreaterThan(0); // Deck should not be empty
  });

  it('should advance the turn', () => {
    const newState = engine.advanceTurn();
    expect(newState.turn).toBe(1);
    // Further assertions for phase changes, etc., will go here as logic is implemented
  });

  it('should apply an action (placeholder)', () => {
    const action: Action = { playerId: 'player1-id', cardId: 'some-card-id' };
    const newState = engine.applyAction(action);
    // Expect state to change based on action, once applyAction is implemented
    expect(newState).toBeDefined(); // Just a basic check for now
  });

  // Add more tests as game logic is implemented
});
