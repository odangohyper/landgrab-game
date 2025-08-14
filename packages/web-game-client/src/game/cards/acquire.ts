// packages/web-game-client/src/game/cards/acquire.ts

// packages/web-game-client/src/game/cards/acquire.ts

import { PlayerState } from '../../types';

/**
 * 「買収」カードの効果を適用します。
 * 相手の不動産を1つ奪います。
 * @param player 効果を適用するプレイヤーの状態
 * @param opponent 相手プレイヤーの状態
 */
export const applyAcquire = (player: PlayerState, opponent: PlayerState): void => {
  if (opponent.properties > 0) {
    opponent.properties -= 1;
    player.properties += 1;
  }
};
