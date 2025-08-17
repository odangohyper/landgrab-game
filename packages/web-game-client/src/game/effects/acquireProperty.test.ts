import { GameState, PlayerState } from '../../types';
import { acquireProperty } from './acquireProperty';

describe('acquireProperty effect', () => {
  let state: GameState;
  let player1: PlayerState;
  let player2: PlayerState;

  beforeEach(() => {
    player1 = { playerId: 'p1', funds: 5, properties: 1, hand: [], deck: [], discard: [] };
    player2 = { playerId: 'p2', funds: 5, properties: 1, hand: [], deck: [], discard: [] };
    state = {
      matchId: 'test', turn: 1, phase: 'RESOLUTION', players: [player1, player2],
      lastActions: [], log: []
    };
  });

  it('should transfer one property from opponent to player', () => {
    const newState = acquireProperty(state, player1.playerId);
    const newPlayer1 = newState.players.find(p => p.playerId === 'p1')!;
    const newPlayer2 = newState.players.find(p => p.playerId === 'p2')!;

    expect(newPlayer1.properties).toBe(2);
    expect(newPlayer2.properties).toBe(0);
  });

  it('should do nothing if opponent has no properties', () => {
    player2.properties = 0;
    const newState = acquireProperty(state, player1.playerId);
    const newPlayer1 = newState.players.find(p => p.playerId === 'p1')!;
    const newPlayer2 = newState.players.find(p => p.playerId === 'p2')!;

    expect(newPlayer1.properties).toBe(1);
    expect(newPlayer2.properties).toBe(0);
  });
});
