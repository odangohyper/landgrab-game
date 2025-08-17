import { GameState, PlayerState, EffectAction } from '../../types';
import { gainFunds } from './gainFunds';

describe('gainFunds effect', () => {
  let state: GameState;
  let player1: PlayerState;
  let player2: PlayerState; // opponent 用に追加

  beforeEach(() => {
    player1 = { playerId: 'p1', funds: 5, properties: 1, hand: [], deck: [], discard: [] };
    player2 = { playerId: 'p2', funds: 0, properties: 1, hand: [], deck: [], discard: [] }; // opponent 用に追加
    state = {
      matchId: 'test', turn: 1, phase: 'RESOLUTION', players: [player1, player2], // player2 を追加
      lastActions: [], log: []
    };
  });

  it('should increase player funds by the specified value', () => {
    const action: EffectAction = { name: 'GAIN_FUNDS', value: 3 };
    const newState = gainFunds(state, player1.playerId, player2.playerId, action); // player2.playerId を追加
    const newPlayer1 = newState.players.find(p => p.playerId === 'p1')!;

    expect(newPlayer1.funds).toBe(8); // 5 + 3
  });

  it('should not change funds if value is not provided', () => {
    const action: EffectAction = { name: 'GAIN_FUNDS' }; // No value
    const newState = gainFunds(state, player1.playerId, player2.playerId, action); // player2.playerId を追加
    const newPlayer1 = newState.players.find(p => p.playerId === 'p1')!;

    expect(newPlayer1.funds).toBe(5);
  });
});