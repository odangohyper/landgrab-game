import { PlayerState } from '../../types';
import { applyDefend } from './defend';

describe('applyDefend', () => {
  let player: PlayerState;

  beforeEach(() => {
    player = {
      playerId: 'player1',
      funds: 0,
      properties: 1,
      hand: [],
      deck: [],
      discard: [],
    };
  });

  it('should not change player properties or funds', () => {
    applyDefend(player);
    expect(player.properties).toBe(1);
    expect(player.funds).toBe(0);
  });
});