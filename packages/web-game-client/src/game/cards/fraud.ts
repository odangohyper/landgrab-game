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
    return `プレイヤーは「詐欺」をプレイし、相手から不動産を1つ奪いました。`;
  } else {
    return `プレイヤーは「詐欺」をプレイしましたが、相手は奪える不動産を持っていませんでした。`;
  }
  // 相手の買収を無効化するロジックは、アクション解決フェーズで実装されます。
};
