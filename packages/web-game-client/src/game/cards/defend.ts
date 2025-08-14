// packages/web-game-client/src/game/cards/defend.ts

// packages/web-game-client/src/game/cards/defend.ts

import { PlayerState } from '../../types';

/**
 * 「防衛」カードの効果を適用します。
 * 相手の「買収」を無効化します。
 * この関数は、買収カードの解決時に呼び出されることを想定しています。
 * @param player 防衛カードを出したプレイヤーの状態
 */
export const applyDefend = (player: PlayerState): void => {
  // The logic to nullify the opponent's ACQUIRE is handled in the engine's resolveActions phase.
  // This function remains as a placeholder for potential future defense-specific effects.
};
