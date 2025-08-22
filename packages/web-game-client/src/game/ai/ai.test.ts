import { calculate_weights, choose_card } from './ai';
import { GameState, Card, CardTemplate, Action } from '../../types'; // CardInstance を Card に変更

describe('AI', () => {
  let gameState: GameState;
  let cardTemplates: { [key: string]: CardTemplate };
  let player1Id: string;
  let player2Id: string;

  beforeEach(() => {
    player1Id = 'player1';
    player2Id = 'player2';

    cardTemplates = {
      'ACQUIRE': {
        templateId: 'ACQUIRE', name: '買収', cost: 2, serialId: '001', illustPath: '', flavorText: '',
        effect: { category: 'ATTACK', priority: 1, target: 'OPPONENT', actions: [{ name: 'ACQUIRE_PROPERTY', value: 1 }] }
      },
      'DEFEND': {
        templateId: 'DEFEND', name: '防衛', cost: 0, serialId: '002', illustPath: '', flavorText: '',
        effect: { category: 'DEFENSE', priority: 2, target: 'SELF', actions: [{ name: 'BLOCK_ACTION' }] }
      },
      'FRAUD': {
        templateId: 'FRAUD', name: '詐欺', cost: 1, serialId: '003', illustPath: '', flavorText: '',
        effect: { category: 'ATTACK', priority: 1, target: 'OPPONENT', actions: [{ name: 'CANCEL_EFFECT' }, { name: 'ACQUIRE_PROPERTY', value: 1 }] }
      },
      'GAIN_FUNDS': {
        templateId: 'GAIN_FUNDS', name: '資金集め', cost: 0, serialId: '004', illustPath: '', flavorText: '',
        effect: { category: 'SUPPORT', priority: 0, target: 'SELF', actions: [{ name: 'GAIN_FUNDS', value: 3 }] }
      },
    };

    gameState = {
      matchId: 'testMatch',
      turn: 1,
      players: [
        { playerId: player1Id, properties: 1, funds: 0, deck: [], hand: [], discard: [] },
        { playerId: player2Id, properties: 1, funds: 0, deck: [], hand: [], discard: [] },
      ],
      phase: 'ACTION',
      lastActions: [],
      log: [],
      result: 'IN_PROGRESS',
    };
  });

  describe('calculate_weights', () => {
    it('should return weights for cards in hand based on game state', () => {
      const hand: Card[] = [
        { id: 'c1', templateId: 'ACQUIRE' },
        { id: 'c2', templateId: 'DEFEND' },
        { id: 'c3', templateId: 'GAIN_FUNDS' },
      ];

      const weights = calculate_weights(gameState, hand, cardTemplates);

      expect(weights.get('ACQUIRE')).toBeDefined();
      expect(weights.get('DEFEND')).toBeDefined();
      expect(weights.get('GAIN_FUNDS')).toBeDefined();
    });

    it('should prioritize GAIN_FUNDS if player has low funds and no properties to acquire', () => {
      gameState.players.find(p => p.playerId === player1Id)!.funds = 0;
      gameState.players.find(p => p.playerId === player2Id)!.properties = 0;

      const hand: Card[] = [
        { id: 'c1', templateId: 'ACQUIRE' },
        { id: 'c2', templateId: 'DEFEND' },
        { id: 'c3', templateId: 'GAIN_FUNDS' },
      ];

      const weights = calculate_weights(gameState, hand, cardTemplates);

      const sortedWeights = Array.from(weights.entries()).sort((a, b) => b[1] - a[1]);
      expect(sortedWeights[0][0]).toBe('GAIN_FUNDS');
    });

    it('should prioritize ACQUIRE if opponent has properties and player has funds', () => {
      gameState.players.find(p => p.playerId === player1Id)!.funds = 5;
      gameState.players.find(p => p.playerId === player2Id)!.properties = 1;

      const hand: Card[] = [
        { id: 'c1', templateId: 'ACQUIRE' },
        { id: 'c2', templateId: 'DEFEND' },
        { id: 'c3', templateId: 'GAIN_FUNDS' },
      ];

      const weights = calculate_weights(gameState, hand, cardTemplates);

      const sortedWeights = Array.from(weights.entries()).sort((a, b) => b[1] - a[1]);
      expect(sortedWeights[0][0]).toBe('ACQUIRE');
    });
  });

  describe('choose_card', () => {
    it('should return an Action based on weights and seed', () => {
      const hand: Card[] = [
        { id: 'c1', templateId: 'ACQUIRE' },
        { id: 'c2', templateId: 'DEFEND' },
        { id: 'c3', templateId: 'GAIN_FUNDS' },
      ];
      const seed = 123;

      const action = choose_card(gameState, hand, seed, cardTemplates);

      expect(action).toBeDefined();
      expect(action?.actionType).toBeDefined();
    });

    it('should return COLLECT_FUNDS if no cards can be played due to cost', () => {
      gameState.players.find(p => p.playerId === player1Id)!.funds = 0;

      const hand: Card[] = [
        { id: 'c1', templateId: 'ACQUIRE' },
        { id: 'c2', templateId: 'FRAUD' },
      ];
      const seed = 456;

      const action = choose_card(gameState, hand, seed, cardTemplates);

      expect(action?.actionType).toBe('collect_funds');
    });

    it('should return a card if player has enough funds', () => {
      gameState.players.find(p => p.playerId === player1Id)!.funds = 5;

      const hand: Card[] = [
        { id: 'c1', templateId: 'ACQUIRE' },
        { id: 'c2', templateId: 'DEFEND' },
      ];
      const seed = 789;

      const action = choose_card(gameState, hand, seed, cardTemplates);

      expect(action?.actionType).toBe('play_card');
      expect(action?.cardUuid).toBeDefined();
    });

    it('should return the same card for the same seed and game state', () => {
      const hand: Card[] = [
        { id: 'c1', templateId: 'ACQUIRE' },
        { id: 'c2', templateId: 'DEFEND' },
        { id: 'c3', templateId: 'GAIN_FUNDS' },
      ];
      const seed = 1011;

      const action1 = choose_card(gameState, hand, seed, cardTemplates);
      const action2 = choose_card(gameState, hand, seed, cardTemplates);

      expect(action1).toEqual(action2);
    });
  });
});
