// packages/web-game-client/src/auth/NullAuthAdapter.ts

// AuthAdapterインターフェースをインポートします。
// これにより、NullAuthAdapterがこのインターフェースの契約を満たしていることを保証します。
import { AuthAdapter } from './AuthAdapter';

// ローカルストレージにクライアントIDを保存する際のキーを定数として定義します。
// ハードコーディングを防ぎ、保守性を高めます。
const CLIENT_ID_KEY = 'landgrab_client_id';

/**
 * NullAuthAdapterクラスは、認証機能を提供しないダミーのアダプターです。
 * AuthAdapterインターフェースを実装しており、認証を必要としないクライアントや
 * テスト目的で使用することを想定しています。
 *
 * このアダプターは、ユーザーを識別するためのユニークなクライアントIDを生成し、
 * ローカルストレージに永続化します。
 */
export class NullAuthAdapter implements AuthAdapter {
  // クライアントIDを保持するプライベートプロパティです。
  private clientId: string;

  /**
   * NullAuthAdapterのコンストラクタです。
   * インスタンスが作成される際に、クライアントIDの初期化を行います。
   */
  constructor() {
    // ローカルストレージから既存のクライアントIDを取得しようと試みます。
    let storedClientId = localStorage.getItem(CLIENT_ID_KEY);

    // クライアントIDがローカルストレージに存在しない場合、新しく生成します。
    if (!storedClientId) {
      storedClientId = this.generateUniqueId();
      // 新しいIDをローカルストレージに保存し、次回以降も同じIDを使用できるようにします。
      localStorage.setItem(CLIENT_ID_KEY, storedClientId);
    }

    // 最終的に取得または生成されたIDを、このインスタンスのclientIdプロパティに設定します。
    this.clientId = storedClientId;
  }

  /**
   * 現在のクライアントIDを返します。
   *
   * @returns クライアントを識別するための一意のID
   */
  getClientId(): string {
    return this.clientId;
  }

  /**
   * ユニークなIDを生成するためのプライベートメソッドです。
   * UUID v4に似た形式の文字列を生成します。
   *
   * @returns 生成されたユニークなID文字列
   */
  private generateUniqueId(): string {
    // デモンストレーション用のシンプルなUUIDライクなジェネレーターです。
    // `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` の形式に沿って、ランダムな16進数で置換します。
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      // 0から15までのランダムな整数を生成します。
      const r = Math.random() * 16 | 0;
      // 文字が 'x' の場合はランダムな16進数を、'y' の場合は特定の形式（8, 9, a, b）の値を返します。
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      // 生成された数値を16進数文字列に変換して返します。
      return v.toString(16);
    });
  }
}