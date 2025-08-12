// packages/web-game-client/src/game/cards/defend.ts

// packages/web-game-client/src/game/cards/defend.ts

import { PlayerState } from '../../types';

/**
 * 「防衛」カードの効果を適用します。
 * 相手の「買収」を無効化します。
 * この関数は、買収カードの解決時に呼び出されることを想定しています。
 * @param player 防衛カードを出したプレイヤーの状態
 */
export const applyDefend = (player: PlayerState) => {
  console.log(`Player ${player.playerId} used DEFEND. Opponent's ACQUIRE will be nullified.`);
  // 実際の無効化ロジックは、アクション解決フェーズで実装されます。
};
