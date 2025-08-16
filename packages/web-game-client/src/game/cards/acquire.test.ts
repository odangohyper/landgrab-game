import { PlayerState } from '../../types';
import { applyAcquire } from './acquire';

describe('applyAcquire', () => {
  let player: PlayerState;
  let opponent: PlayerState;

  beforeEach(() => {
    player = {
      playerId: 'player1',
      funds: 0,
      properties: 1,
      hand: [],
      deck: [],
      discard: [],
    };
    opponent = {
      playerId: 'opponent1',
      funds: 0,
      properties: 1,
      hand: [],
      deck: [],
      discard: [],
    };
  });

  it('should transfer a property from opponent to player if opponent has properties', () => {
    applyAcquire(player, opponent);
    expect(player.properties).toBe(2);
    expect(opponent.properties).toBe(0);
  });

  it('should not transfer a property if opponent has no properties', () => {
    opponent.properties = 0;
    applyAcquire(player, opponent);
    expect(player.properties).toBe(1); // Should remain 1
    expect(opponent.properties).toBe(0); // Should remain 0
  });
});