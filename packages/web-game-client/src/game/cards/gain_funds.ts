// packages/web-game-client/src/game/cards/gain_funds.ts

// packages/web-game-client/src/game/cards/gain_funds.ts

import { PlayerState } from '../../types';

/**
 * 「資金集め」カードの効果を適用します。
 * 資金が2増加します。
 * @param player 効果を適用するプレイヤーの状態
 */
export const applyGainFunds = (player: PlayerState) => {
  player.funds += 2;
  console.log(`Player ${player.playerId} used GAIN_FUNDS. Funds: ${player.funds}`);
};
