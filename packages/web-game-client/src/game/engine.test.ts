// packages/web-game-client/src/game/engine.test.ts

import { GameState, PlayerState, Action, Card, CardTemplate } from '../types';
import { GameEngine } from './engine';

describe('GameEngine', () => {
  let initialState: GameState;
  let engine: GameEngine;
  const mockCardTemplates: { [key: string]: CardTemplate } = {
    'GAIN_FUNDS': { templateId: 'GAIN_FUNDS', name: '資金集め', cost: 0, type: 'GAIN_FUNDS' },
    'ACQUIRE': { templateId: 'ACQUIRE', name: '買収', cost: 2, type: 'ACQUIRE' },
    'DEFEND': { templateId: 'DEFEND', name: '防衛', cost: 0, type: 'DEFEND' },
    'FRAUD': { templateId: 'FRAUD', name: '詐欺', cost: 1, type: 'FRAUD' },
  };

  beforeEach(() => {
    initialState = GameEngine.createInitialState('player1-id', 'player2-id', mockCardTemplates);
    engine = new GameEngine(initialState, mockCardTemplates);
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

  it('should correctly apply actions and resolve a simple turn', () => {
    // Setup: Give players specific cards and enough funds
    const player1 = engine.getState().players.find(p => p.playerId === 'player1-id')!;
    player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
    player1.funds = 3;

    const player2 = engine.getState().players.find(p => p.playerId === 'player2-id')!;
    player2.hand = [{ id: 'p2card', templateId: 'GAIN_FUNDS' }];
    player2.funds = 1;

    // Create a new engine with this modified state to ensure clean test
    const testEngine = new GameEngine(engine.getState(), mockCardTemplates);

    const player1Action: Action = { playerId: 'player1-id', cardId: 'p1card' };
    const player2Action: Action = { playerId: 'player2-id', cardId: 'p2card' };

    // Act
    const newState = testEngine.applyAction(player1Action, player2Action);

    // Assert
    const newPlayer1 = newState.players.find(p => p.playerId === 'player1-id')!;
    const newPlayer2 = newState.players.find(p => p.playerId === 'player2-id')!;

    // Player 1 played ACQUIRE (cost 2), funds were 3 -> 1
    // and took 1 property from player 2
    expect(newPlayer1.funds).toBe(1);
    expect(newPlayer1.properties).toBe(2);

    // Player 2 played GAIN_FUNDS (cost 0), funds were 1, gained 2 -> 3
    // and lost 1 property to player 1
    expect(newPlayer2.funds).toBe(3);
    expect(newPlayer2.properties).toBe(0);

    // Check that lastActions were recorded
    expect(newState.lastActions).toHaveLength(2);
    expect(newState.lastActions).toContainEqual({ playerId: 'player1-id', cardTemplateId: 'ACQUIRE' });
    expect(newState.lastActions).toContainEqual({ playerId: 'player2-id', cardTemplateId: 'GAIN_FUNDS' });
  });

  // Add more tests as game logic is implemented
});
