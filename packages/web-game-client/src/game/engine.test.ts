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
    expect(player1?.deck.length).toBeGreaterThan(0);

    expect(player2).toBeDefined();
    expect(player2?.funds).toBe(2);
    expect(player2?.properties).toBe(1);
    expect(player2?.deck.length).toBeGreaterThan(0);
  });

  it('should advance the turn and draw cards', () => {
    const player1 = engine.getState().players[0];
    player1.hand = []; // Ensure hand is empty to trigger draw
    const newState = engine.advanceTurn();
    expect(newState.turn).toBe(1);
    expect(newState.phase).toBe('ACTION');
    const updatedPlayer1 = newState.players[0];
    expect(updatedPlayer1.hand.length).toBe(3);
  });

  it('should reshuffle discard pile into deck when deck is empty', () => {
    const state = engine.getState();
    const player1 = state.players[0];
    player1.hand = [];
    player1.discard = [...player1.deck]; // Move all cards from deck to discard
    player1.deck = [];
    
    const testEngine = new GameEngine(state, mockCardTemplates);
    const newState = testEngine.advanceTurn();
    
    const updatedPlayer1 = newState.players[0];
    expect(updatedPlayer1.deck.length).toBeGreaterThan(0);
    expect(updatedPlayer1.discard.length).toBe(0);
    expect(updatedPlayer1.hand.length).toBe(3);
  });

  describe('Action Resolution Scenarios', () => {
    let player1: PlayerState;
    let player2: PlayerState;
    let testState: GameState;

    beforeEach(() => {
      testState = JSON.parse(JSON.stringify(initialState));
      player1 = testState.players.find(p => p.playerId === 'player1-id')!;
      player2 = testState.players.find(p => p.playerId === 'player2-id')!;
    });

    it('should resolve ACQUIRE vs GAIN_FUNDS correctly', () => {
      player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
      player1.funds = 3;
      player2.hand = [{ id: 'p2card', templateId: 'GAIN_FUNDS' }];
      player2.funds = 1;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', cardId: 'p2card' };
      const newState = testEngine.applyAction(p1Action, p2Action);

      const newPlayer1 = newState.players[0];
      const newPlayer2 = newState.players[1];

      expect(newPlayer1.funds).toBe(1); // 3 - 2
      expect(newPlayer1.properties).toBe(2);
      expect(newPlayer2.funds).toBe(3); // 1 + 0 (no turn-based income) + 2
      expect(newPlayer2.properties).toBe(0);
      expect(newState.log).toContain('プレイヤーは「買収」をプレイした');
      expect(newState.log).toContain('対戦相手は「資金集め」をプレイした');
    });

    it('should nullify both actions in an ACQUIRE vs ACQUIRE conflict', () => {
      player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
      player1.funds = 2;
      player2.hand = [{ id: 'p2card', templateId: 'ACQUIRE' }];
      player2.funds = 2;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', cardId: 'p2card' };
      const newState = testEngine.applyAction(p1Action, p2Action);

      const newPlayer1 = newState.players[0];
      const newPlayer2 = newState.players[1];

      expect(newPlayer1.properties).toBe(1); // No change
      expect(newPlayer2.properties).toBe(1); // No change
    });

    it('should nullify ACQUIRE with DEFEND', () => {
      player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
      player1.funds = 2;
      player2.hand = [{ id: 'p2card', templateId: 'DEFEND' }];
      player2.funds = 0;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', cardId: 'p2card' };
      const newState = testEngine.applyAction(p1Action, p2Action);

      const newPlayer1 = newState.players[0];
      const newPlayer2 = newState.players[1];

      expect(newPlayer1.properties).toBe(1); // No change
      expect(newPlayer2.properties).toBe(1); // No change
    });

    it('should nullify ACQUIRE with FRAUD and let FRAUD succeed', () => {
      player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
      player1.funds = 2;
      player2.hand = [{ id: 'p2card', templateId: 'FRAUD' }];
      player2.funds = 1;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', cardId: 'p2card' };
      const newState = testEngine.applyAction(p1Action, p2Action);

      const newPlayer1 = newState.players[0];
      const newPlayer2 = newState.players[1];

      expect(newPlayer1.properties).toBe(0); // Lost property to fraud
      expect(newPlayer2.properties).toBe(2); // Gained property via fraud
    });

    it('should not allow a player to play a card they cannot afford', () => {
        player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
        player1.funds = 1; // Not enough funds (cost is 2)
        player2.hand = [{ id: 'p2card', templateId: 'GAIN_FUNDS' }];
        player2.funds = 1;
  
        const testEngine = new GameEngine(testState, mockCardTemplates);
        const p1Action: Action = { playerId: 'player1-id', cardId: 'p1card' };
        const p2Action: Action = { playerId: 'player2-id', cardId: 'p2card' };
        const newState = testEngine.applyAction(p1Action, p2Action);
  
        const newPlayer1 = newState.players[0];
        const newPlayer2 = newState.players[1];
  
        expect(newPlayer1.properties).toBe(1); // No change, action failed
        expect(newPlayer2.properties).toBe(1); // No change, P2's action still resolves
        expect(newPlayer2.funds).toBe(3); // 1 + 2
        expect(newState.log).not.toContain('プレイヤーは「買収」をプレイした');
        expect(newState.log).toContain('対戦相手は「資金集め」をプレイした');
    });
  });

  it('should end the game when a player loses all properties', () => {
    const testState = JSON.parse(JSON.stringify(initialState));
    const player1 = testState.players.find(p => p.playerId === 'player1-id')!;
    player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
    player1.funds = 2;

    const player2 = testState.players.find(p => p.playerId === 'player2-id')!;
    player2.hand = []; // No card to play
    player2.properties = 1; // Has one property to lose

    const testEngine = new GameEngine(testState, mockCardTemplates);
    const p1Action: Action = { playerId: 'player1-id', cardId: 'p1card' };
    const newState = testEngine.applyAction(p1Action, null);

    expect(newState.phase).toBe('GAME_OVER');
  });
});
