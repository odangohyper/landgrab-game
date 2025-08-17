import { GameState, PlayerState, EffectAction } from '../../types';

export function gainFunds(state: GameState, playerId: string, opponentId: string, action: EffectAction): GameState {
  const newState = JSON.parse(JSON.stringify(state));
  const player = newState.players.find(p => p.playerId === playerId);

  if (player) {
    const amount = action.value || 0;
    player.funds += amount;
  }

  return newState;
}
