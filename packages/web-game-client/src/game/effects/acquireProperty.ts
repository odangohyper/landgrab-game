import { GameState, PlayerState, EffectAction } from '../../types';

export function acquireProperty(state: GameState, playerId: string, opponentId: string, action: EffectAction): GameState {
  const newState = JSON.parse(JSON.stringify(state));
  const player = newState.players.find(p => p.playerId === playerId);
  const opponent = newState.players.find(p => p.playerId === opponentId);

  if (player && opponent && opponent.properties > 0) {
    player.properties += 1;
    opponent.properties -= 1;
  }

  return newState;
}