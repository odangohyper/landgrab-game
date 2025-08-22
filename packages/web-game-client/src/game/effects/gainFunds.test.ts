import { gainFunds } from './gainFunds';
import { GameState, EffectAction } from '../../types';

describe('gainFunds', () => {
  let state: GameState;
  let player1Id: string;
  let player2Id: string;

  beforeEach(() => {
    player1Id = 'player1';
    player2Id = 'player2';
    state = {
      matchId: 'testMatch',
      turn: 1,
      players: [
        { playerId: player1Id, properties: 1, funds: 0, deck: [], hand: [], discard: [] },
        { playerId: player2Id, properties: 1, funds: 0, deck: [], hand: [], discard: [] },
      ],
      phase: 'RESOLUTION',
      lastActions: [],
      log: [],
      result: 'IN_PROGRESS',
    };
  });

  it('should increase player funds by the specified value', () => {
    const action: EffectAction = { name: 'GAIN_FUNDS', value: 5 };
    const newState = gainFunds(state, player1Id, player2Id, action);

    expect(newState.players.find(p => p.playerId === player1Id)?.funds).toBe(5);
    // expect(newState.log).toContain(`${player1Id}が5資金を得た！`); // コメントアウト
  });

  it('should increase player funds by 0 if value is not specified', () => {
    const action: EffectAction = { name: 'GAIN_FUNDS' };
    const newState = gainFunds(state, player1Id, player2Id, action);

    expect(newState.players.find(p => p.playerId === player1Id)?.funds).toBe(0);
    // expect(newState.log).toContain(`${player1Id}が0資金を得た！`); // コメントアウト
  });
});