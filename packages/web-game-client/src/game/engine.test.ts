import { GameEngine } from './engine';
import { GameState, CardTemplate, Action } from '../types';

describe('GameEngine', () => {
  let engine: GameEngine;
  let initialState: GameState;
  let cardTemplates: { [key: string]: CardTemplate };

  beforeEach(() => {
    cardTemplates = {
      'ACQUIRE': { templateId: 'ACQUIRE', name: '買収', cost: 2, serialId: '001', illustPath: '', flavorText: '', effect: { category: 'ATTACK', priority: 1, target: 'OPPONENT', actions: [{ name: 'ACQUIRE_PROPERTY', value: 1 }] } },
      'DEFEND': { templateId: 'DEFEND', name: '防衛', cost: 0, serialId: '002', illustPath: '', flavorText: '', effect: { category: 'DEFENSE', priority: 2, target: 'SELF', actions: [{ name: 'BLOCK_ACTION' }] } },
      'FRAUD': { templateId: 'FRAUD', name: '詐欺', cost: 1, serialId: '003', illustPath: '', flavorText: '', effect: { category: 'ATTACK', priority: 1, target: 'OPPONENT', actions: [{ name: 'CANCEL_EFFECT' }, { name: 'ACQUIRE_PROPERTY', value: 1 }] } },
      'CONDITIONAL_ACQUIRE': { templateId: 'CONDITIONAL_ACQUIRE', name: '条件付き買収', cost: 1, serialId: '007', illustPath: '', flavorText: '', effect: { category: 'ATTACK', priority: 1, target: 'OPPONENT', actions: [{ name: 'ACQUIRE_PROPERTY', value: 1 }], conditions: { opponentPlayedCard: 'DEFEND' } } },
      'COLLECT_FUNDS': { templateId: 'COLLECT_FUNDS', name: '資金集め', cost: 0, serialId: 'SYS', illustPath: '', flavorText: '', effect: { category: 'SUPPORT', priority: 0, target: 'SELF', actions: [{ name: 'GAIN_FUNDS', value: 2 }] } },
    };

    initialState = {
      matchId: 'testMatch', turn: 1, players: [
        { playerId: 'p1', properties: 1, funds: 5, deck: [], hand: [], discard: [] },
        { playerId: 'p2', properties: 1, funds: 5, deck: [], hand: [], discard: [] },
      ], phase: 'ACTION', lastActions: [], log: [], result: 'IN_PROGRESS',
    };
    engine = new GameEngine(initialState, cardTemplates);
  });

  it('should correctly handle DEFEND vs ACQUIRE', () => {
    initialState.players[0].hand = [{ uuid: 'p1-defend', templateId: 'DEFEND' }];
    initialState.players[1].hand = [{ uuid: 'p2-acquire', templateId: 'ACQUIRE' }];
    engine.setState(initialState);
    const p1Action: Action = { playerId: 'p1', actionType: 'play_card', cardUuid: 'p1-defend' };
    const p2Action: Action = { playerId: 'p2', actionType: 'play_card', cardUuid: 'p2-acquire' };
    const finalState = engine.applyAction(p1Action, p2Action);
    expect(finalState.players.find(p => p.playerId === 'p1')?.properties).toBe(1);
    expect(finalState.players.find(p => p.playerId === 'p2')?.properties).toBe(1);
  });

  it('should cancel effect if condition is not met', () => {
    initialState.players[0].hand = [{ uuid: 'p1-cond', templateId: 'CONDITIONAL_ACQUIRE' }];
    initialState.players[1].hand = [{ uuid: 'p2-acquire', templateId: 'ACQUIRE' }]; // Opponent does not play DEFEND
    engine.setState(initialState);
    const p1Action: Action = { playerId: 'p1', actionType: 'play_card', cardUuid: 'p1-cond' };
    const p2Action: Action = { playerId: 'p2', actionType: 'play_card', cardUuid: 'p2-acquire' };
    const finalState = engine.applyAction(p1Action, p2Action);
    // p1's conditional acquire should fail
    expect(finalState.players.find(p => p.playerId === 'p1')?.properties).toBe(1);
  });

  it('should ignore action if card is not in hand', () => {
    initialState.players[0].hand = [{ uuid: 'p1-defend', templateId: 'DEFEND' }];
    engine.setState(initialState);
    const p1Action: Action = { playerId: 'p1', actionType: 'play_card', cardUuid: 'card-not-in-hand' };
    const finalState = engine.applyAction(p1Action, null);
    expect(finalState.players[0].funds).toBe(5); // No cost should be paid
  });

  it('should reshuffle discard pile into deck when deck is empty', () => {
    initialState.players[0].deck = [];
    initialState.players[0].hand = [{ uuid: 'h1', templateId: 'DEFEND' }];
    initialState.players[0].discard = [
      { uuid: 'd1', templateId: 'ACQUIRE' }, { uuid: 'd2', templateId: 'ACQUIRE' },
      { uuid: 'd3', templateId: 'ACQUIRE' }, { uuid: 'd4', templateId: 'ACQUIRE' },
    ];
    engine.setState(initialState);
    const nextTurnState = engine.advanceTurn();
    const p1State = nextTurnState.players.find(p => p.playerId === 'p1');
    expect(p1State?.hand.length).toBe(3);
    expect(p1State?.deck.length).toBe(2);
    expect(p1State?.discard.length).toBe(0);
  });
});
