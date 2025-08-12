// packages/web-game-client/src/api/realtimeClient.ts

import { database } from '../firebaseConfig';
import { ref, push, set, onValue, off, DataSnapshot } from 'firebase/database';
import { GameState, Action, CardTemplate } from '../types'; // Assuming these types are needed

// Realtime Database の推奨スキーマ（初期）
// * `/matches/{matchId}/state` → 現在の GameState（JSON）
// * `/matches/{matchId}/actions/{playerId}` → 各プレイヤーの提出した action（存在をもって「提出」扱い）
// * `/cards/{version}/templates` → カードテンプレート（JSON）
// * `/logs/{matchId}` → 対戦ログ（イベントの配列）

/**
 * 新しいマッチを作成し、そのIDを返します。
 * @returns 新しく作成されたマッチのID
 */
export async function createMatch(): Promise<string> {
  const matchesRef = ref(database, 'matches');
  const newMatchRef = push(matchesRef); // FirebaseがユニークなIDを生成
  const matchId = newMatchRef.key;

  if (!matchId) {
    throw new Error('Failed to generate match ID.');
  }

  // 初期GameStateは後で設定されるため、ここでは空のオブジェクトをセット
  await set(ref(database, `matches/${matchId}/state`), {});
  await set(ref(database, `matches/${matchId}/actions`), {});
  await set(ref(database, `logs/${matchId}`), []); // 空のログ配列を初期化

  console.log(`Match created with ID: ${matchId}`);
  return matchId;
}

/**
 * プレイヤーのアクションをRealtime Databaseに書き込みます。
 * @param matchId マッチID
 * @param playerId プレイヤーID
 * @param action プレイヤーのアクション
 */
export async function putAction(matchId: string, playerId: string, action: Action): Promise<void> {
  const actionRef = ref(database, `matches/${matchId}/actions/${playerId}`);
  await set(actionRef, action);
  console.log(`Action for player ${playerId} in match ${matchId} put to DB.`);
}

/**
 * Realtime Database上の特定のマッチのアクションを監視します。
 * @param matchId マッチID
 * @param callback アクションが更新されたときに呼び出されるコールバック関数
 * @returns 監視を停止するためのアンサブスクライブ関数
 */
export function watchActions(matchId: string, callback: (actions: { [playerId: string]: Action }) => void): () => void {
  const actionsRef = ref(database, `matches/${matchId}/actions`);
  const listener = onValue(actionsRef, (snapshot: DataSnapshot) => {
    const actions = snapshot.val() || {};
    callback(actions);
  });
  console.log(`Watching actions for match ${matchId}.`);
  return () => off(actionsRef, 'value', listener); // アンサブスクライブ関数
}

/**
 * Realtime Database上のゲームの状態を更新します。
 * @param matchId マッチID
 * @param gameState 更新するゲームの状態
 */
export async function writeState(matchId: string, gameState: GameState): Promise<void> {
  const stateRef = ref(database, `matches/${matchId}/state`);
  await set(stateRef, gameState);
  console.log(`Game state for match ${matchId} written to DB.`);
}

/**
 * Realtime Database上のカードテンプレートを読み込みます。
 * @param version カードテンプレートのバージョン (例: 'v1')
 * @returns カードテンプレートのマップ
 */
export async function fetchCardTemplates(version: string = 'v1'): Promise<{ [templateId: string]: CardTemplate }> {
  const templatesRef = ref(database, `cards/${version}/templates`);
  const snapshot = await new Promise<DataSnapshot>((resolve) => {
    onValue(templatesRef, (snap) => {
      off(templatesRef, 'value'); // 一度読み込んだらリスナーを解除
      resolve(snap);
    }, { onlyOnce: true }); // 一度だけ読み込む
  });
  return snapshot.val() || {};
}

/**
 * Realtime Databaseに対戦ログを追加します。
 * @param matchId マッチID
 * @param logEntry 追加するログエントリ
 */
export async function addLogEntry(matchId: string, logEntry: any): Promise<void> {
  const logsRef = ref(database, `logs/${matchId}`);
  const newLogEntryRef = push(logsRef); // FirebaseがユニークなIDを生成
  await set(newLogEntryRef, logEntry);
  console.log(`Log entry added for match ${matchId}.`);
}
