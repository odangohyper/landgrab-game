import { GameState, PlayerState, Card, CardTemplate, Action } from '../../types';
import { calculate_weights, choose_card } from './ai';

describe('AI Functions', () => {
  let mockGameState: GameState;
  let mockPlayer: PlayerState;
  let mockOpponent: PlayerState;
  let mockCardTemplates: { [key: string]: CardTemplate };

  beforeEach(() => {
    mockCardTemplates = {
      'ACQUIRE': { templateId: 'ACQUIRE', name: '買収', cost: 2, type: 'ACQUIRE' },
      'DEFEND': { templateId: 'DEFEND', name: '防衛', cost: 0, type: 'DEFEND' },
      'FRAUD': { templateId: 'FRAUD', name: '詐欺', cost: 1, type: 'FRAUD' },
      'BRIBE': { templateId: 'BRIBE', name: '賄賂', cost: 5, type: 'BRIBE' },
      'INVEST': { templateId: 'INVEST', name: '投資', cost: 1, type: 'INVEST' },
    };

    mockPlayer = {
      playerId: 'npc-player-id',
      funds: 0,
      properties: 1,
      hand: [],
      deck: [],
      discard: [],
    };

    mockOpponent = {
      playerId: 'player1-id',
      funds: 0,
      properties: 1,
      hand: [],
      deck: [],
      discard: [],
    };

    mockGameState = {
      matchId: 'test-match',
      turn: 1,
      players: [mockOpponent, mockPlayer], // Ensure mockPlayer is at index 1 for consistency with engine
      phase: 'ACTION',
      lastActions: [],
      log: [],
    };
  });

  describe('calculate_weights', () => {
    it('should return an empty map if npcPlayer is not found', () => {
      const stateWithoutNpc: GameState = {
        ...mockGameState,
        players: [mockOpponent], // mockPlayerを含まない
      };
      const weights = calculate_weights(stateWithoutNpc, [], mockCardTemplates);
      expect(weights.size).toBe(0);
    });

    it('should assign base weight to COLLECT_FUNDS_COMMAND', () => {
      const weights = calculate_weights(mockGameState, [], mockCardTemplates);
      expect(weights.get('COLLECT_FUNDS_COMMAND')).toBeGreaterThanOrEqual(1);
    });

    it('should prioritize COLLECT_FUNDS_COMMAND when funds are 0', () => {
      mockPlayer.funds = 0;
      const weights = calculate_weights(mockGameState, [], mockCardTemplates);
      expect(weights.get('COLLECT_FUNDS_COMMAND')).toBe(1 + 10 + 7); // Base + low funds + cannot play any card
    });

    it('should prioritize COLLECT_FUNDS_COMMAND when funds are 1', () => {
      mockPlayer.funds = 1;
      const weights = calculate_weights(mockGameState, [], mockCardTemplates);
      expect(weights.get('COLLECT_FUNDS_COMMAND')).toBe(1 + 5 + 7); // Base + low funds + cannot play any card
    });

    it('should prioritize COLLECT_FUNDS_COMMAND when no cards can be afforded', () => {
      mockPlayer.funds = 0;
      mockPlayer.hand = [{ id: 'c1', templateId: 'ACQUIRE' }]; // Cost 2
      const weights = calculate_weights(mockGameState, mockPlayer.hand, mockCardTemplates);
      expect(weights.get('COLLECT_FUNDS_COMMAND')).toBe(1 + 10 + 7); // Base + low funds + cannot play any card
      expect(weights.get('c1')).toBe(0.01); // Unaffordable card
    });

    it('should assign weights to playable cards based on funds and opponent properties', () => {
      mockPlayer.funds = 5;
      mockPlayer.properties = 1;
      mockOpponent.properties = 3; // Opponent has many properties
      mockPlayer.hand = [
        { id: 'c1', templateId: 'ACQUIRE' },
        { id: 'c2', templateId: 'DEFEND' },
        { id: 'c3', templateId: 'FRAUD' },
      ];
      const weights = calculate_weights(mockGameState, mockPlayer.hand, mockCardTemplates);
      
      // ACQUIRE: Base (1) + opponent properties (4) + sufficient funds (3) = 8
      expect(weights.get('c1')).toBe(1 + 4 + 3); 
      
      // DEFEND: Base (1) + opponent can acquire (4) = 5 (assuming opponent has funds for acquire)
      mockOpponent.funds = 5; // Ensure opponent can acquire for DEFEND weight
      const weightsWithOpponentFunds = calculate_weights(mockGameState, mockPlayer.hand, mockCardTemplates);
      expect(weightsWithOpponentFunds.get('c2')).toBe(1 + 4); 

      // FRAUD: Base (1) + fraud success (5) = 6 (assuming opponent can acquire)
      expect(weightsWithOpponentFunds.get('c3')).toBe(1 + 5); 
    });

    it('should assign weights to DEFEND and FRAUD when opponent cannot acquire', () => {
      mockPlayer.funds = 5;
      mockOpponent.funds = 0; // 相手は買収できない
      mockPlayer.hand = [
        { id: 'c1', templateId: 'ACQUIRE' },
        { id: 'c2', templateId: 'DEFEND' },
        { id: 'c3', templateId: 'FRAUD' },
      ];
      const weights = calculate_weights(mockGameState, mockPlayer.hand, mockCardTemplates);

      // ACQUIRE: 相手の資産は1なので、基本(1) + 資産(2) + 資金(3) = 6
      expect(weights.get('c1')).toBe(1 + 2 + 3);

      // DEFEND: 相手が買収できないので、DEFENDの重みは基本値のみ
      expect(weights.get('c2')).toBe(1);

      // FRAUD: 相手が買収できないので、FRAUDの重みは基本値のみ
      expect(weights.get('c3')).toBe(1);
    });

    it('should assign high weight to BRIBE when affordable and opponent has property', () => {
      mockPlayer.funds = 5;
      mockOpponent.properties = 1;
      mockPlayer.hand = [{ id: 'c1', templateId: 'BRIBE' }];
      const weights = calculate_weights(mockGameState, mockPlayer.hand, mockCardTemplates);
      expect(weights.get('c1')).toBe(1 + 8);
    });

    it('should assign higher weight to INVEST when funds are low', () => {
      mockPlayer.funds = 2; // Low funds
      mockPlayer.hand = [{ id: 'c1', templateId: 'INVEST' }];
      const weights = calculate_weights(mockGameState, mockPlayer.hand, mockCardTemplates);
      expect(weights.get('c1')).toBe(1 + 4);
    });

    it('should assign base weight to INVEST when funds are high', () => {
      mockPlayer.funds = 5; // High funds
      mockPlayer.hand = [{ id: 'c1', templateId: 'INVEST' }];
      const weights = calculate_weights(mockGameState, mockPlayer.hand, mockCardTemplates);
      expect(weights.get('c1')).toBe(1);
    });
  });

  describe('choose_card', () => {
    it('should return COLLECT_FUNDS command if it is the only playable option', () => {
      mockPlayer.funds = 0;
      mockPlayer.hand = [{ id: 'c1', templateId: 'ACQUIRE' }]; // Unaffordable
      const action = choose_card(mockGameState, mockPlayer.hand, 123, mockCardTemplates);
      expect(action).toEqual({ playerId: 'npc-player-id', actionType: 'collect_funds' });
    });

    it('should return a card action if a card is chosen', () => {
      mockPlayer.funds = 5;
      mockPlayer.hand = [{ id: 'c1', templateId: 'ACQUIRE' }];
      const action = choose_card(mockGameState, mockPlayer.hand, 123, mockCardTemplates);
      expect(action).toEqual({ playerId: 'npc-player-id', actionType: 'play_card', cardId: 'c1' });
    });

    it('should return COLLECT_FUNDS command if chosen by weight', () => {
      mockPlayer.funds = 0; // Make COLLECT_FUNDS highly weighted
      mockPlayer.hand = [{ id: 'c1', templateId: 'ACQUIRE' }]; // Make ACQUIRE unaffordable
      // Manipulate weights to force COLLECT_FUNDS selection
      jest.spyOn(require('./ai'), 'calculate_weights').mockReturnValue(new Map([
        ['c1', 0.01],
        ['COLLECT_FUNDS_COMMAND', 100],
      ]));
      const action = choose_card(mockGameState, mockPlayer.hand, 123, mockCardTemplates);
      expect(action).toEqual({ playerId: 'npc-player-id', actionType: 'collect_funds' });
      jest.restoreAllMocks(); // Clean up mock
    });

    it('should return a card action if chosen by weight', () => {
      mockPlayer.funds = 5;
      mockPlayer.hand = [{ id: 'c1', templateId: 'ACQUIRE' }];
      // Manipulate weights to force ACQUIRE selection
      jest.spyOn(require('./ai'), 'calculate_weights').mockReturnValue(new Map([
        ['c1', 100],
        ['COLLECT_FUNDS_COMMAND', 0.01],
      ]));
      const action = choose_card(mockGameState, mockPlayer.hand, 123, mockCardTemplates);
      expect(action).toEqual({ playerId: 'npc-player-id', actionType: 'play_card', cardId: 'c1' });
      jest.restoreAllMocks(); // Clean up mock
    });

    it('should return a collect_funds action if no action is chosen (e.g., weights are empty)', () => {
      jest.spyOn(require('./ai'), 'calculate_weights').mockReturnValue(new Map()); // 空のMapを返すようにモック
      const action = choose_card(mockGameState, mockPlayer.hand, 123, mockCardTemplates);
      // フォールバックとして資金集めが選択される
      expect(action).toEqual({ playerId: 'npc-player-id', actionType: 'collect_funds' });
      jest.restoreAllMocks(); // Clean up mock
    });
  });
});
