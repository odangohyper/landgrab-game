import { acquireProperty } from './acquireProperty';
import { GameState, EffectAction } from '../../types';

describe('acquireProperty', () => {
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

  it('should transfer a property from opponent to player, even if it makes opponent lose', () => {
    // Setup: Opponent has 1 property, player has 1.
    const action: EffectAction = { name: 'ACQUIRE_PROPERTY' };
    
    // Execute
    const newState = acquireProperty(state, player1Id, player2Id, action);

    // Verify: The property is transferred.
    expect(newState.players.find(p => p.playerId === player1Id)?.properties).toBe(2);
    expect(newState.players.find(p => p.playerId === player2Id)?.properties).toBe(0);

    // Verify: The function ITSELF does not change the game result or phase.
    // This is the responsibility of the GameEngine, not the effect function.
    expect(newState.result).toBe('IN_PROGRESS');
    expect(newState.phase).toBe('RESOLUTION');
  });

  it('should not transfer property if opponent has no properties', () => {
    // Setup: Opponent has 0 properties.
    state.players.find(p => p.playerId === player2Id)!.properties = 0;
    const action: EffectAction = { name: 'ACQUIRE_PROPERTY' };

    // Execute
    const newState = acquireProperty(state, player1Id, player2Id, action);

    // Verify: Properties remain unchanged.
    expect(newState.players.find(p => p.playerId === player1Id)?.properties).toBe(1);
    expect(newState.players.find(p => p.playerId === player2Id)?.properties).toBe(0);
    expect(newState.result).toBe('IN_PROGRESS');
  });
});
