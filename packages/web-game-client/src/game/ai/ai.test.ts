import { GameState, PlayerState, Card, CardTemplate, Action, Deck } from '../../types';
import { calculate_weights, choose_card } from './ai';

// Using the same data-driven mock templates as engine.test.ts
const mockCardTemplates: { [key: string]: CardTemplate } = {
  ACQUIRE: {
    templateId: 'ACQUIRE', serialId: '010-001', name: '買収', cost: 2,
    illustPath: '', flavorText: '',
    effect: { category: 'ATTACK', priority: 5, target: 'OPPONENT', actions: [{ name: 'ACQUIRE_PROPERTY', value: 1 }] }
  },
  DEFEND: {
    templateId: 'DEFEND', serialId: '010-002', name: '防衛', cost: 0,
    illustPath: '', flavorText: '',
    effect: { category: 'DEFENSE', priority: 10, target: 'SELF', actions: [{ name: 'CANCEL_EFFECT', conditions: { opponentCardCategory: 'ATTACK' } }] }
  },
  FRAUD: {
    templateId: 'FRAUD', serialId: '010-003', name: '詐欺', cost: 1,
    illustPath: '', flavorText: '',
    effect: { category: 'DEFENSE', priority: 10, target: 'OPPONENT', actions: [
      { name: 'CANCEL_EFFECT', conditions: { opponentCardTemplateId: 'ACQUIRE' } },
      { name: 'ACQUIRE_PROPERTY', value: 1, conditions: { opponentCardTemplateId: 'ACQUIRE' } }
    ]}
  },
  BRIBE: {
    templateId: 'BRIBE', serialId: '010-004', name: '賄賂', cost: 5,
    illustPath: '', flavorText: '',
    effect: { category: 'ATTACK', priority: 8, target: 'OPPONENT', actions: [{ name: 'ACQUIRE_PROPERTY', value: 1 }] }
  },
  INVEST: {
    templateId: 'INVEST', serialId: '010-005', name: '投資', cost: 1,
    illustPath: '', flavorText: '',
    effect: { category: 'SUPPORT', priority: 1, target: 'SELF', actions: [{ name: 'GAIN_FUNDS', value: 3 }] }
  },
  COLLECT_FUNDS: { // For the command
    templateId: 'COLLECT_FUNDS', serialId: '000-001', name: '資金集め', cost: 0,
    illustPath: '', flavorText: '',
    effect: { category: 'SUPPORT', priority: 0, target: 'SELF', actions: [{ name: 'GAIN_FUNDS', value: 1 }] }
  }
};

describe('AI Functions (Data-Driven)', () => {
  let gameState: GameState;
  let npc: PlayerState;
  let opponent: PlayerState;

  beforeEach(() => {
    npc = { playerId: 'npc-player-id', funds: 3, properties: 1, hand: [], deck: [], discard: [] };
    opponent = { playerId: 'player1-id', funds: 3, properties: 1, hand: [], deck: [], discard: [] };
    gameState = {
      matchId: 'test-match', turn: 1, players: [opponent, npc],
      phase: 'ACTION', lastActions: [], log: [],
    };
  });

  describe('calculate_weights', () => {
    it('should prioritize ATTACK when opponent has property and NPC can afford it', () => {
      npc.hand = [{ id: 'c1', templateId: 'ACQUIRE' }];
      npc.funds = 2;
      opponent.properties = 2;
      const weights = calculate_weights(gameState, npc.hand, mockCardTemplates);
      // Base (1) + ATTACK (5) - OpponentCanAcquirePenalty (1) = 5
      expect(weights.get('c1')).toBeCloseTo(5);
    });

    it('should deprioritize ATTACK when opponent has no property', () => {
      npc.hand = [{ id: 'c1', templateId: 'ACQUIRE' }];
      npc.funds = 2;
      opponent.properties = 0;
      const weights = calculate_weights(gameState, npc.hand, mockCardTemplates);
      expect(weights.get('c1')).toBe(0);
    });

    it('should prioritize DEFENSE when NPC has property and opponent can attack', () => {
      npc.hand = [{ id: 'c1', templateId: 'DEFEND' }];
      npc.properties = 1;
      opponent.funds = 5; // Opponent can afford ACQUIRE and BRIBE
      const weights = calculate_weights(gameState, npc.hand, mockCardTemplates);
      // Base (1) + DEFENSE condition met (6) = 7
      expect(weights.get('c1')).toBeCloseTo(7);
    });

    it('should deprioritize DEFENSE when opponent cannot attack', () => {
      npc.hand = [{ id: 'c1', templateId: 'DEFEND' }];
      npc.properties = 1;
      opponent.funds = 0; // Opponent cannot afford any attack
      const weights = calculate_weights(gameState, npc.hand, mockCardTemplates);
      expect(weights.get('c1')).toBeCloseTo(0.1);
    });

    it('should prioritize SUPPORT (INVEST) when funds are low', () => {
      npc.hand = [{ id: 'c1', templateId: 'INVEST' }];
      npc.funds = 1; // Low funds, but can afford INVEST
      const weights = calculate_weights(gameState, npc.hand, mockCardTemplates);
      // Base (1) + SUPPORT condition met (5) = 6
      expect(weights.get('c1')).toBeCloseTo(6);
    });

    it('should highly prioritize COLLECT_FUNDS when no other card is playable', () => {
      npc.hand = [{ id: 'c1', templateId: 'BRIBE' }]; // Cost 5
      npc.funds = 4; // Cannot afford
      const weights = calculate_weights(gameState, npc.hand, mockCardTemplates);
      expect(weights.get('COLLECT_FUNDS_COMMAND')).toBeCloseTo(11); // Base (1) + No affordable cards (10)
      expect(weights.get('c1')).toBe(0.01);
    });
  });

  describe('choose_card', () => {
    it('should return a card action for the highest weighted playable card', () => {
      npc.hand = [{ id: 'c1', templateId: 'ACQUIRE' }, { id: 'c2', templateId: 'INVEST' }];
      npc.funds = 2;
      opponent.properties = 2; // Makes ACQUIRE highly valuable
      const action = choose_card(gameState, npc.hand, 123, mockCardTemplates);
      // ACQUIRE weight (6) > INVEST weight (1), so ACQUIRE should be chosen
      expect(action?.actionType).toBe('play_card');
      expect(action?.cardId).toBe('c1');
    });

    it('should default to COLLECT_FUNDS if no card is playable', () => {
        npc.hand = [{ id: 'c1', templateId: 'BRIBE' }]; // Cost 5
        npc.funds = 4; // Cannot afford
        const action = choose_card(gameState, npc.hand, 123, mockCardTemplates);
        expect(action?.actionType).toBe('collect_funds');
    });

    it('should return a fallback action if all weights are zero', () => {
        npc.hand = [];
        // Mock weights to be all zero, which is an edge case
        jest.spyOn(require('./ai'), 'calculate_weights').mockReturnValue(new Map());
        const action = choose_card(gameState, npc.hand, 123, mockCardTemplates);
        expect(action?.actionType).toBe('collect_funds');
        jest.restoreAllMocks();
    });
  });
});