// packages/web-game-client/src/game/cards/fraud.ts

// packages/web-game-client/src/game/cards/fraud.ts

import { PlayerState } from '../../types';

/**
 * 「詐欺」カードの効果を適用します。
 * 相手が「買収」を出していた場合、それを無効にし、代わりに相手の不動産を1つ奪います。
 * この関数は、買収カードの解決時に呼び出されることを想定しています。
 * @param player 詐欺カードを出したプレイヤーの状態
 * @param opponent 相手プレイヤーの状態
 */
export const applyFraud = (player: PlayerState, opponent: PlayerState): string => {
  if (opponent.properties > 0) {
    opponent.properties -= 1;
    player.properties += 1;
    return `${player.playerId} played FRAUD and took 1 property from ${opponent.playerId}.`;
  } else {
    return `${player.playerId} played FRAUD, but ${opponent.playerId} has no properties to take.`;
  }
  // 相手の買収を無効化するロジックは、アクション解決フェーズで実装されます。
};
