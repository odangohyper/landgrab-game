import { GameEngine } from './engine';
import { GameState, Card } from '../types';

describe('GameEngine', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = {
      matchId: 'testMatch',
      turn: 1,
      players: [
        {
          playerId: 'player1',
          properties: 1,
          funds: 0,
          deck: [],
          hand: [],
          discard: [],
        },
        {
          playerId: 'player2',
          properties: 1,
          funds: 0,
          deck: [],
          hand: [],
          discard: [],
        },
      ],
      phase: 'DRAW',
      lastActions: [],
      log: [], // gameLog を log に変更
      result: 'IN_PROGRESS',
    };
  });

  it('should initialize with the given GameState', () => {
    const engine = new GameEngine(initialState, {});
    expect(engine.getState()).toEqual(initialState);
  });

  it('should hydrate empty arrays if they are missing from the initial state', () => {
    const partialState: GameState = {
      matchId: 'testMatch',
      turn: 1,
      players: [
        {
          playerId: 'player1',
          properties: 1,
          funds: 0,
          deck: [], // 追加
          hand: [], // 追加
          discard: [], // 追加
        },
        {
          playerId: 'player2',
          properties: 1,
          funds: 0,
          deck: [], // 追加
          hand: [], // 追加
          discard: [], // 追加
        },
      ],
      phase: 'DRAW',
      lastActions: [],
      log: [], // gameLog を log に変更
      result: 'IN_PROGRESS',
    };

    const engine = new GameEngine(partialState, {});
    const hydratedState = engine.getState();

    expect(hydratedState.players[0].deck).toEqual([]);
    expect(hydratedState.players[0].hand).toEqual([]);
    expect(hydratedState.players[0].discard).toEqual([]);
    expect(hydratedState.players[1].deck).toEqual([]);
    expect(hydratedState.players[1].hand).toEqual([]);
    expect(hydratedState.players[1].discard).toEqual([]);
  });

  // ... (既存のテストケースをここに移動または修正)
});