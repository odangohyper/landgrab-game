import { GameState, PlayerState, Action, Card, CardTemplate, Deck } from '../types';
import { GameEngine } from './engine';

// New, data-driven mock card templates
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

const mockPlayer1Deck: Deck = { name: 'p1deck', cards: { ACQUIRE: 2, DEFEND: 2, FRAUD: 2, BRIBE: 2, INVEST: 2 } };
const mockPlayer2Deck: Deck = { name: 'p2deck', cards: { ACQUIRE: 2, DEFEND: 2, FRAUD: 2, BRIBE: 2, INVEST: 2 } };

describe('GameEngine (Data-Driven)', () => {
  let initialState: GameState;
  let engine: GameEngine;

  beforeEach(() => {
    initialState = GameEngine.createInitialState('p1', 'p2', mockCardTemplates, mockPlayer1Deck, mockPlayer2Deck);
    engine = new GameEngine(initialState, mockCardTemplates);
  });

  it('should create an initial game state correctly', () => {
    const state = engine.getState();
    expect(state.turn).toBe(0);
    expect(state.phase).toBe('DRAW');
    expect(state.players.length).toBe(2);
    const player1 = state.players[0];
    expect(player1.playerId).toBe('p1');
    expect(player1.funds).toBe(0);
    expect(player1.properties).toBe(1);
    expect(player1.deck.length).toBe(10);
  });

  it('should advance turn, discard old hand, and draw 3 new cards', () => {
    let state = engine.advanceTurn(); // Turn 1
    expect(state.turn).toBe(1);
    expect(state.players[0].hand.length).toBe(3);
    expect(state.players[0].deck.length).toBe(7);

    const handCard = state.players[0].hand[0];
    state = engine.applyAction({ playerId: 'p1', actionType: 'play_card', cardId: handCard.id }, null);
    
    state = engine.advanceTurn(); // Turn 2
    expect(state.turn).toBe(2);
    expect(state.players[0].hand.length).toBe(3);
    expect(state.players[0].deck.length).toBe(4);
    expect(state.players[0].discard.length).toBe(3); // 1 from play, 2 from end of turn
  });

  describe('Action Resolution Scenarios', () => {
    const setupScenario = (p1HandTemplates: string[], p1Funds: number, p2HandTemplates: string[], p2Funds: number): GameState => {
        const scenarioState = GameEngine.createInitialState('p1', 'p2', mockCardTemplates, mockPlayer1Deck, mockPlayer2Deck);
        const p1 = scenarioState.players[0];
        const p2 = scenarioState.players[1];
        p1.hand = p1HandTemplates.map(id => ({ id: `${id}-1`, templateId: id }));
        p1.funds = p1Funds;
        p2.hand = p2HandTemplates.map(id => ({ id: `${id}-2`, templateId: id }));
        p2.funds = p2Funds;
        return scenarioState;
    };

    it('ACQUIRE vs Nothing: should succeed', () => {
      const scenarioState = setupScenario(['ACQUIRE'], 2, [], 0);
      const testEngine = new GameEngine(scenarioState, mockCardTemplates);
      const p1Action: Action = { playerId: 'p1', actionType: 'play_card', cardId: 'ACQUIRE-1' };
      const finalState = testEngine.applyAction(p1Action, null);
      expect(finalState.players[0].properties).toBe(2);
      expect(finalState.players[1].properties).toBe(0);
    });

    it('ACQUIRE vs DEFEND: should be cancelled', () => {
      const scenarioState = setupScenario(['ACQUIRE'], 2, ['DEFEND'], 0);
      const testEngine = new GameEngine(scenarioState, mockCardTemplates);
      const p1Action: Action = { playerId: 'p1', actionType: 'play_card', cardId: 'ACQUIRE-1' };
      const p2Action: Action = { playerId: 'p2', actionType: 'play_card', cardId: 'DEFEND-2' };
      const finalState = testEngine.applyAction(p1Action, p2Action);
      expect(finalState.players[0].properties).toBe(1);
      expect(finalState.players[1].properties).toBe(1);
      expect(finalState.log).toContain('プレイヤーの「買収」は無効化された！');
    });

    it('BRIBE vs DEFEND: should succeed', () => {
        const scenarioState = setupScenario(['BRIBE'], 5, ['DEFEND'], 0);
        const testEngine = new GameEngine(scenarioState, mockCardTemplates);
        const p1Action: Action = { playerId: 'p1', actionType: 'play_card', cardId: 'BRIBE-1' };
        const p2Action: Action = { playerId: 'p2', actionType: 'play_card', cardId: 'DEFEND-2' };
        const finalState = testEngine.applyAction(p1Action, p2Action);
        expect(finalState.players[0].properties).toBe(2);
        expect(finalState.players[1].properties).toBe(0);
        expect(finalState.log).toContain('対戦相手の「防衛」は無効化された！');
    });

    it('ACQUIRE vs FRAUD: ACQUIRE is cancelled, FRAUD steals property', () => {
        const scenarioState = setupScenario(['ACQUIRE'], 2, ['FRAUD'], 1);
        const testEngine = new GameEngine(scenarioState, mockCardTemplates);
        const p1Action: Action = { playerId: 'p1', actionType: 'play_card', cardId: 'ACQUIRE-1' };
        const p2Action: Action = { playerId: 'p2', actionType: 'play_card', cardId: 'FRAUD-2' };
        const finalState = testEngine.applyAction(p1Action, p2Action);
        expect(finalState.players[0].properties).toBe(0);
        expect(finalState.players[1].properties).toBe(2);
        expect(finalState.log).toContain('プレイヤーの「買収」は無効化された！');
    });

    it('ACQUIRE vs ACQUIRE: both are cancelled', () => {
        const scenarioState = setupScenario(['ACQUIRE'], 2, ['ACQUIRE'], 2);
        const testEngine = new GameEngine(scenarioState, mockCardTemplates);
        const p1Action: Action = { playerId: 'p1', actionType: 'play_card', cardId: 'ACQUIRE-1' };
        const p2Action: Action = { playerId: 'p2', actionType: 'play_card', cardId: 'ACQUIRE-2' };
        const finalState = testEngine.applyAction(p1Action, p2Action);
        expect(finalState.players[0].properties).toBe(1);
        expect(finalState.players[1].properties).toBe(1);
        expect(finalState.log).toContain('両者の行動は互いに打ち消しあった！');
    });

    it('INVEST vs Nothing: should gain funds', () => {
        const scenarioState = setupScenario(['INVEST'], 1, [], 0);
        const testEngine = new GameEngine(scenarioState, mockCardTemplates);
        const p1Action: Action = { playerId: 'p1', actionType: 'play_card', cardId: 'INVEST-1' };
        const finalState = testEngine.applyAction(p1Action, null);
        expect(finalState.players[0].funds).toBe(3);
    });

    it('COLLECT_FUNDS vs Nothing: should gain funds', () => {
        const scenarioState = setupScenario([], 0, [], 0);
        const testEngine = new GameEngine(scenarioState, mockCardTemplates);
        const p1Action: Action = { playerId: 'p1', actionType: 'collect_funds' };
        const finalState = testEngine.applyAction(p1Action, null);
        expect(finalState.players[0].funds).toBe(1);
    });
  });
});
