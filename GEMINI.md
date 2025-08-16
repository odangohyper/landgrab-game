# 鹿王院エリザベスの地上げですわ！企画説明書

## 1. ゲーム概要
- **ゲーム名**: 鹿王院エリザベスの地上げですわ！
- **ジャンル**: カジュアル対戦型カードゲーム
- **プレイ人数**: 2人（将来的にはオンラインPvPモードも検討）
- **プレイ時間**: 1セッション3分以内を想定
- **プラットフォーム**: Webブラウザ（将来的にはアプリストアでの配信も検討）

---

## 2. ゲームのコンセプト
「不動産の奪い合い」をテーマにした、シンプルながら奥深い読み合いが楽しめるカジュアルな対戦ゲームです。プレイヤーはデッキを構築し、毎ターン同時にカードを公開することで、相手の行動を読み合うスリルを味わえます。

---

## 3. ゲームシステム

### 勝利条件
相手の不動産をすべて奪ったプレイヤーの勝利。

### デッキ
各プレイヤーは9枚のカードで構成されるデッキを事前に構築します。

### ボード
各プレイヤーは初期状態で不動産：1　資金：0　を所有しています。


### 3.1. ターンの流れ
1. **ドローフェイズ**: デッキから手札が3枚になるようにドローします。山札がなくなった場合は、捨て札をすべて山札に戻してシャッフルし、手札が3枚になるまでドローを継続します。
2. **アクションフェイズ**:
    - プレイヤーは手札からカードを1枚選び、裏向きで同時に公開します。(このとき、コストの支払えないカードは選べません)
    - また、このとき、手札からカードを選んで出す代わりに、「資金集め」の行動も可能です。資金集めは、手札にそのカードがに場合でも、常に選択できます。
    - 公開後、お互いのカードをオープンにし、コストを支払い、効果を適用します。
    - 使用したカード・使わなかったカードともに、すべて捨て札に置かれます。


### 3.2. カードの種類と効果
初期段階では、以下の3種類のカードを用意します。
- **買収**（コスト2）: 相手の不動産を1つ奪います。
- **防衛**（コスト0）: 相手の「買収」を無効化します。
- **詐欺**（コスト1）: 相手が「買収」を出していた場合、それを無効にし、代わりに相手の不動産を1つ奪います。

なお、買収に対して買収が出された場合は、お互いの買収が無効化されます。
また、3種類のカードとは別に、手札のカード提出の代わりとして使える「資金集め」のコマンドがあります。
- **資金集め**（コスト0）: 資金が増加します

### 3.3. 「資金集め」の補足
「資金集め」コマンドは、手札のすべてのカードがプレイできない(コスト超過など)場合の救済措置かつ、バランス調整のために導入されました。もともとは「資金集め」カードでしたが、手札を要求しないコマンドとしたことで、いつでも使用可能となっています。
なお、ゲームUIとしては、「資金集め」カードの挙動を踏襲するため、ユーザ視点では、ゲーム外から「資金集めカード」を発動したような処理になります(デッキに入っていない資金集めカードが発動し、発動後、捨て札にはいかず消滅する)

---

## 4. ゲームの面白さのポイント
- **シンプルかつ奥深い読み合い**: どのカードを出すか、どのタイミングで資金を使うかなど、シンプルな選択肢の中にも、相手の心理を読む戦略性が生まれます。
- **デッキ構築の楽しさ**: どのカードを何枚入れるかによって、プレイスタイルや戦略が大きく変わります。
- **短時間で満足感**: 1セッション3分以内という手軽さで、スキマ時間に繰り返しプレイしたくなる中毒性があります。

---

## 5. 今後の拡張性
### カードバリエーションの追加
- 相手の資金を奪う**「窃盗」**
- 不動産の価値を上げ、買収コストを高くする**「改修」**
- 特定の条件で強力な効果を発揮する**「特殊カード」**など

### NPCキャラクターの追加
- 様々な戦略を持つ個性的なNPCを用意し、プレイヤーが一人でも楽しめるコンテンツを充実させます。

### オンラインPvPモード
- ランキング機能などを実装し、他のプレイヤーと腕を競い合えるモードを実装します。

---

## 6. 開発思想
本プロジェクトでは、短期間での開発と将来的な拡張性を両立させることを最重要視します。ゲームの面白さの核となる**「読み合い」の部分はサーバーサイドで厳密に管理**し、不正行為を防ぐとともに、ルールの変更や新カードの追加が容易な設計とします。UI部分は、プレイヤーが快適にプレイできる体験を追求し、迅速な開発と高い保守性を目指します。

---

## 7. 技術スタック
本ゲームは以下の技術スタックを用いて開発します。

### フロントエンド
- **Vite + React + TypeScript**
    - UIレイヤー: 資金表示やデッキ情報などのUIは、コンポーネント指向で開発効率の高いReactで構築します。
    - ゲーム画面: カードの描画やアニメーションなどのゲーム画面は、2Dゲーム開発に特化したフレームワーク**Phaser 3**を使用します。
    - 言語: **TypeScript**による型付けを徹底し、バグを未然に防ぎ、保守性を高めます。

### バックエンド
- **Python + FastAPI**
    - サーバー: 高速で、APIドキュメントが自動生成される**FastAPI**を使用します。
    - ゲームロジック: ゲームのルールや状態管理は、サーバーサイドで**Python**を用いて一元管理します。

### インフラ/ホスティング
- **Firebase**
    - ホスティング: フロントエンドの静的ファイルを**Firebase Hosting**で配信します。
    - バックエンド: FastAPIで構築したバックエンドは、**Cloud Functions for Firebase**にデプロイします。
    - データベース: ユーザーデータや対戦履歴は、Firebaseのデータベースサービスを利用します。

---

## 8. モノレポ構成とデプロイ戦略
- **モノレポ構成**: フロントエンド（web-game-client）とバックエンド（api-server）のコードを、一つのリポジトリで管理するモノレポ構成を採用します。これにより、プロジェクト全体の一元管理と連携のしやすさを確保します。
- **デプロイ**:
    - フロントエンド: Viteでビルドした静的ファイルをFirebase Hostingにデプロイします。
    - バックエンド: FastAPIサーバーをCloud Functions for Firebaseにデプロイします。
    - デプロイは別々に行いますが、開発中はローカルホストで両方を同時に実行し、統合的にテスト・デバッグすることが可能です。
- **拡張性と保守性**:
    - フロントエンドとバックエンドの役割を明確に分離することで、将来的な機能追加や改修が容易な設計とします。
    - 新しいカードの追加や既存カードの調整は、コードの書き換えではなく、データベースや設定ファイルを編集するだけで済むように設計します。

---

## 9. ディレクトリ設計と各ファイルの責務
本プロジェクトでは、フロントエンドとバックエンドのコードを一つのリポジトリで管理するモノレポ構成を採用します。これにより、プロジェクト全体の一元管理と連携のしやすさを確保しつつ、各部分の独立性を保ちます。

### 9.1. フロントエンド (web-game-client)
- `/src/components`: Reactコンポーネントを配置するディレクトリです。UI要素（資金表示、手札表示、設定画面、デッキ構築画面など）を、再利用可能な部品として管理します。
- `/src/game`: Phaser 3のゲームロジックをすべてここに集約します。
    - `scenes`: ゲームの各画面（タイトル、メインゲーム、リザルトなど）をクラスとして定義します。
    - `objects`: ゲーム内のオブジェクト（カード、プレイヤー、不動産など）のクラスを定義します。
    - `utils`: ゲームに特化したヘルパー関数や定数を管理します。
- `/src/store`: ReactとPhaserの間で共有されるゲームの状態を一元管理します。
- `/src/api`: バックエンドとの通信に関するロジックをカプセル化します。

### 9.2. バックエンド (api-server)
- `/app/api/endpoints.py`: クライアントからのAPIリクエストを受け付けるエンドポイントを定義します。
- `/app/game`: ゲームのコアロジックを管理するディレクトリです。
    - `engine.py`: ターンの進行、カードの効果処理、勝利判定など、ゲームの根幹をなすロジックを担います。
    - `models.py`: プレイヤー、カード、不動産など、ゲーム内で使用されるデータの構造を定義します。
- `/app/npc/ai_logic.py`: NPCのAIに関するロジックを実装します。
- `/app/db/database.py`: データベースへの接続や、データの読み書きといった低レベルな処理を集約します。
- `/app/main.py`: FastAPIアプリケーションのエントリーポイントです。

---

## 10. NPC対戦の設計
本ゲームでは、プレイヤーが一人でも楽しめるよう、バックエンド側で動作するNPCとの対戦機能を実装します。NPCの思考ロジックは、将来的には複数パターンを用意し、異なる難易度を提供します。

- **実装方針**:
    - 当面は、重み付け行動型のAIを実装します。
    - NPCは、ゲームの状況（自分の資金、相手の不動産の数など）に応じて、手札の各カードに動的な重み付けを行います。
    - 設定された重み付けに基づき、確率的にプレイするカードを決定します。
    - これにより、単純なランダム行動ではなく、ある程度の戦略性を持ったNPCとの対戦が可能となり、プレイヤーは段階的にゲームの読み合いを学べます。

---

## 10. 開発ロードマップ（初期版）
- **フェーズ1: プロトタイプ開発 (2週間)**
    - フロントエンド: Phaser 3でカードの描画、ドラッグ＆ドロップ、アニメーションを実装。Vite + ReactでUIを構築。
    - バックエンド: FastAPIでサーバーを立ち上げ、WebSocket経由で通信する基盤を構築。
    - ゲームロジック: 4種類のカードの基本的な効果処理を実装。
    - NPC: 重み付け行動型AIのプロトタイプを実装。
    - ホスティング: Firebase HostingとCloud Functionsでデプロイし、動作確認。
- **フェーズ2: デッキ構築機能とUI改善 (2週間)**
    - フロントエンド: デッキ構築画面を実装。UI/UXを洗練し、アニメーションやエフェクトを追加。
    - バックエンド: ユーザーごとにデッキを保存・読み込みするAPIエンドポイントを実装。
    - データベース: PostgreSQLでユーザー情報、デッキ情報、対戦ログを管理するスキーマを設計。
- **フェーズ3: ゲームバランス調整とコンテンツ追加 (2週間)**
    - ゲームロジック: プレイテストを重ね、カードのコストや効果を調整。
    - NPC: AIの重み付けパラメータを調整し、難易度を微調整。
    - カード: 新しいカードのアイデアをいくつか追加し、実装。
- **フェーズ4: PVPモードの検討と実装 (以降)**
    - バックエンド: マッチメイキング機能とレート計算ロジックを実装。
    - UI: ランキング表示やプレイヤープロフィール画面を実装。

---

## 11. 開発者目線での実装概要計画
- **ゲームロジックの設計**:
    - ゲームの状態を管理するGameStateオブジェクトを設計します。
    - カードの効果は、GameStateオブジェクトを引数として受け取り、その状態を更新する関数として実装します。
- **NPCのAIロジック**:
    - `calculate_weights(game_state, npc_hand)` のような関数を作成し、ゲームの状態とNPCの手札を引数として受け取ります。
    - この関数内で、現在の状況に応じて、各カードに点数（重み）を付けます。
    - `random.choices()`のような関数を使って、重み付けに基づいてプレイするカードを確率的に選びます。
- **クライアント・サーバー間の通信プロトコル**:
    - WebSocketを通じてやり取りするメッセージのデータ構造をTypeScriptで厳密に定義します。
    - 例: `{"type": "play_card", "card_id": 123}` や `{"type": "game_state_update", "payload": { ... }}` といったプロトコルを設計します。

---

# 鹿王院エリザベスの地上げですわ！ 仕様書（追記・修正版）

最終更新日: 2025-08-11

### 概要
本書は、既存の企画説明書に対し、実装方針決定（認証の扱い、リアルタイム方式、NPC優先等）に基づいて追記・修正した最新版です。初期フェーズでは小規模かつ安価に開発できる構成を優先し、将来的な拡張（認証導入、PvP、サーバーサイド化）を容易にする設計方針を維持します。

---

## 主要な運用決定（今回確定）
1. **認証**:
    - 初期フェーズでは認証を実装しません。
    - 将来的な導入を容易にするため、匿名認証（Firebase Anonymous Auth）に切り替え可能な設計を行います。
    - 実装方針: 認証が無くても内部的に一時的な `clientId` を発行・管理できる抽象レイヤを用意します（`AuthAdapter` インターフェース）。
2. **対戦優先度**:
    - 当面は**NPC対戦（シングルプレイ）**を優先して実装します。PvPは将来的なフェーズで追加。
    - NPCの行動ロジックは初期では**クライアント側で実行**します（ローカルAI）。
    - 将来サーバー側に移行できるように、AIロジックは独立モジュール化し、クライアント・サーバー両方で動く同一インターフェースを用意します。
3. **データベース**:
    - **Firebase**を採用し、初期は**Realtime Database**を利用します。
    - 将来的にFirestoreへ移行する際は抽象レイヤを作成して差し替え可能にします。
4. **リアルタイム同期方式**:
    - WebSocketサーバーは現時点では不要と判断し、**Realtime Databaseの監視**を利用して同期を行います。
    - PvP実装などで必要が出た場合は、Cloud Run 等で WebSocket サーバーを導入する計画を残します。
5. **同時公開（同ターン解決）の整合性**:
    - 両者が確定処理（行動を提出）するまで待機してから解決を行う方式を採用します。
    - NPCはプレイヤーの提出を待たずに即座に行動を決定し、プレイヤーが提出したら解決処理を走らせます。
6. **カード選択ルール**:
    - コストが不足するカードはUI上で選択不可にします。
    - 将来、サーバー側でも最終検証を行う設計にしておきます。
7. **ゲームロジックの配置（工程的暫定方針）**:
    - プロトタイプ／初期フェーズでは、2つの実行モードをサポートします。
        - `ServerAuthoritativeMode`（将来のPvP用）: Cloud側で `GameEngine` を実行、クライアントは表示と入力のみ。
        - `LocalSinglePlayerMode`（当面のNPC用）: クライアントが `GameEngine` を実行してNPCと処理。
    - エンジン実装は必ず**同じルールセット（同一ソースのロジック）**がサーバー/クライアント両方で動くように抽象化します。
8. **AI（NPC）の設計**:
    - 重み付け行動型で初期はクライアント内で稼働します。
    - AIモジュールは `calculate_weights(game_state, hand)` といった純粋関数を提供し、シード値で再現可能にします。
9. **Realtime DB の役割**:
    - マッチ状態（`matchState`）、プレイヤーの一時ID、対戦ログ、カードテンプレートの配信などを格納します。
    - 実装例（ツリー構造）:
        - `/matches/{matchId}/state` → 現在のGameState
        - `/matches/{matchId}/actions/{playerId}` → プレイヤーが提出した行動
        - `/cards/{version}/templates` → カードテンプレート
        - `/logs/{matchId}` → 対戦イベントログ

---

## 追記した設計上の注意点（実装チーム向け）
- **AuthAdapter を必須化**: 最初は `NullAuthAdapter` を使い、将来 `FirebaseAuthAdapter` に差し替えられるようにします。
- **Game Engine の二重運用をサポート**: エンジンは確定論的（deterministic）であること、外部依存（乱数等）はシードで注入できることを要求。
- **クライアントでの検証**: クライアントは送信前に手札・コスト・ルールチェックを行い、不可能な選択肢を提示しないようにします。
- **Realtime Database の競合処理**: Realtime DB のトランザクション機能を利用し、両者の行動提出時に整合性を保ちます。

---

## ファイル責務（追記）
- フロント側の `AuthAdapter` インターフェース追加（実装: `NullAuthAdapter`）。
- `/src/api/wsClient.ts` は当面不要ですが、将来WebSocketを導入するための抽象インターフェース `RealtimeClient` を定義しておきます。
- バックエンドの `engine.py` はserver-authoritative実行を想定した実装を用意するが、クライアント内で同一ロジックが動くようにTypeScriptの移植版を用意します。

---

## 未解決の小項目（将来すぐ決めるとよい）
- PvPを実装する場合の早期指針（Cloud RunでWebSocketを立てる等）
- 対戦ログの保持期間・容量ポリシー
- カードのイラスト・アセットの正式フォーマット
- 多言語化（i18n）対応の可否

---

## 次のステップ（推奨）
1. 開発ブランチを切り、`LocalSinglePlayerMode`（クライアント実行のGameEngine）で動くプロトタイプを作成する。
2. Realtime Databaseの試作スキーマを作成し、`matches/{matchId}` を書き込むフローを実装する。
3. `AuthAdapter`: `NullAuthAdapter` を実装して、プレイごとに一意な `clientId` を発行する。
4. AIモジュール（重み付け関数）の単体テストを先行して作成する。




## 1. 現状の主要決定（必ず守ること）

* **認証**：初期フェーズは認証を実装しない（**認証スキップ**）。ただし将来的に容易に差し替えられるよう `AuthAdapter` 抽象層を実装する。初期実装は `NullAuthAdapter`（localStorage に `clientId` を発行・保存）を使う。
* **対戦優先度**：当面は **NPC 対戦（シングルプレイ）を優先**。PvP は後続フェーズ。
* **DB**：Firebase を採用し、初期は **Realtime Database** を使う（低コスト・リアルタイム実装が容易）。
* **リアルタイム同期**：WebSocket は導入せず、Realtime Database の監視（onValue 等）を使う。将来 PvP・大規模化で Cloud Run + WebSocket 等に移行可能な設計にする。
* **同時公開（ターン解決）**：両者の行動が提出されるまで待機し、**両方揃ってから一括で解決**（コミット・リビール方式は未採用）。
* **カード選択ルール**：UI 上で **コスト不足のカードは選択不可（disabled）** にする。将来サーバー側でも最終検証を行う。
* **Game Engine の配置**：初期はクライアントで `LocalSinglePlayerMode` を動かすが、同一ロジックをサーバー (`ServerAuthoritativeMode`) に移行できるよう抽象化しておく。
* **NPC（AI）**：重み付き行動型。`calculate_weights(game_state, hand)` → `choose_card`。シード対応で再現性を持たせる。

---

## 2. 技術スタック（確定）

* フロント：Vite + React + TypeScript（UI） + Phaser 3（ゲーム描画/アニメーション）
* バックエンド：Python + FastAPI（将来的な server-authoritative engine、API）
* データベース / ホスティング：Firebase（Realtime Database + Firebase Hosting）
* モノレポ：`packages/web-game-client`, `packages/api-server`（pnpm / yarn workspaces 推奨）
* CI：GitHub Actions（lint → unit-test → build）

---

## 3. 最低限のデータ構造とファイル配置（実装目安）

* ルート

  * `specs/game_state.json` — JSON Schema（GameState, PlayerState, CardTemplate, Action）
  * `README.md`, `.gitignore`, `LICENSE`（MIT 推奨）
* `packages/web-game-client`

  * `src/types.ts` — TS 型（GameState など）
  * `src/auth/AuthAdapter.ts`（interface）
  * `src/auth/NullAuthAdapter.ts`
  * `src/game/engine.ts`（Local engine）
  * `src/game/cards/*.ts`（gain\_funds / steal\_property / block\_acquire / fraud）
  * `src/game/ai/ai.ts`
  * `src/api/realtimeClient.ts`（Realtime DB ラッパー）
  * `src/components/HandView.tsx`, `Hud/FundsDisplay.tsx` 等
  * `src/game/scenes/MainGameScene.ts`（Phaser 統合）
* `packages/api-server`

  * `app/main.py`
  * `app/api/endpoints.py`
  * `app/game/engine.py`（将来の server engine）
  * `app/game/models.py`（Pydantic）
  * `app/db/database.py`（Firestore/RTDB 抽象レイヤ）

---

## 4. Realtime Database の推奨スキーマ（初期）

* `/matches/{matchId}/state` → 現在の GameState（JSON）
* `/matches/{matchId}/actions/{playerId}` → 各プレイヤーの提出した action（存在をもって「提出」扱い）
* `/cards/{version}/templates` → カードテンプレート（JSON）
* `/logs/{matchId}` → 対戦ログ（イベントの配列）

**動作フロー（簡潔）**

1. プレイヤーがカードを確定 → `PUT /matches/{matchId}/actions/{playerId}` に書く
2. NPC（クライアント内）あるいは NPC 書き込み処理が `actions` に既に書く
3. DB watch が「両者の actions が揃った」と検知 → 解決処理（クライアント側 engine または将来サーバー）を走らせ、`/matches/{matchId}/state` を更新、`/logs/{matchId}` に追記

---

## 5. 主要ファイルの責務（抜粋）

* `AuthAdapter`（interface）: 認証レイヤの抽象。初期は `NullAuthAdapter` を使う。
* `engine.ts`（Local）: ターンの検証・解決（pure functions）。card effects はプラグイン化。
* `ai.ts`: `calculate_weights(gameState, hand)` と `choose_card(gameState, hand, seed)` を公開。
* `realtimeClient.ts`: `createMatch`, `putAction`, `watchActions`, `writeState` を提供。
* `MainGameScene.ts`（Phaser）: カードスプライト、フリップアニメ、勝利演出など描画。
* `api/endpoints.py`: デッキ保存、match 作成、resolve（将来）等の REST エンドポイント。
* `engine.py`（server）: 将来の server-authoritative 解決ロジック（create\_state, apply\_action, resolve\_turn）。

---

## 6. 優先タスク（短期：直ちに着手すべき順）

（各タスクは「完了条件」＋想定工数を明確化）

### 優先度A（核）

1. **モノレポ初期セットアップ**（`packages/web-game-client`, `packages/api-server`） — 完了条件：クライアント dev 起動、サーバー `/docs` 表示。見積：0.5–1 日
2. **共通スキーマ（specs/game\_state.json） + TS 型 + Pydantic** — 完了条件：サンプル JSON がフロント/バックで検証可能。見積：0.5 日
3. **NullAuthAdapter の実装**（`AuthAdapter` interface、`NullAuthAdapter`、API に `X-Client-Id` ヘッダ） — 完了条件：API 呼び出しで `X-Client-Id` を確認できること。見積：0.25–0.5 日
4. **Local Game Engine（TypeScript）実装（4カード） + ユニットテスト** — 完了条件：基本ターンのユニットテストが通ること。見積：1–2 日
5. **Hand UI（カード表示・選択・disabled）** — 完了条件：選べないカードは押せず、選択で Local Engine が解決されること。見積：1–2 日

### 優先度B（順次）

* Realtime Database ラッパー（createMatch/putAction/watchActions） — 見積：0.5–1 日
* NPC AI（重み付け、seed 対応） — 見積：0.5–1 日
* Phaser 統合（カードフリップ等） — 見積：0.5–1 日
* Server-side engine（骨組み） — 見積：1–2 日
* CI の最小導入（GitHub Actions） — 見積：0.5–1 日

---

## 7. 受け入れ基準（主要）

* ローカル対戦（プレイヤー vs NPC）で、プレイヤーが手札からカードを1枚選び決定 → NPC が行動 → 双方揃ったら engine が解決し、資金・不動産の状態が正しく更新されること。
* `specs/game_state.json` に合致した GameState が存在すること。
* フロントリポジトリで `pnpm dev` 起動、API サーバーで `uvicorn` 起動が可能なこと。
* `X-Client-Id` ヘッダがクライアントから送られ、サーバー側で確認できること。
* 単体テスト（engine, AI）が通ること、CI が PR ごとに走ること。

---

## 8. README / .gitignore / LICENSE（初期テンプレート）

**README.md（最小雛形）**

```markdown
# 鹿王院エリザベスの地上げですわ！

簡易説明: カジュアル対戦型カードゲーム（NPC優先フェーズ）。  
技術: Vite + React + TypeScript + Phaser3 / FastAPI / Firebase Realtime Database

## 開発セットアップ（ローカル）
1. リポジトリを clone
2. ルートで `pnpm install`
3. `packages/web-game-client`: `pnpm --filter web-game-client dev`
4. `packages/api-server`: `uvicorn app.main:app --reload`
5. Firebase の `firebaseConfig` は `.env.local` に設定

## 主要コマンド
- `pnpm --filter web-game-client dev`
- `pnpm --filter web-game-client build`
- `uvicorn packages/api-server/app.main:app --reload`
```

**.gitignore（最低）**

```
# Node
node_modules/
dist/
build/

# Env
.env
.env.local

# Vite
/.vite

# Python
__pycache__/
*.pyc
venv/

# Firebase
firebase-debug.log
```

**LICENSE（推奨：MIT）**（抜粋、ルートに `LICENSE` ファイルとして保存）

```
MIT License

Copyright (c) 2025 <Your Name>

Permission is hereby granted, free of charge, to any person obtaining a copy...
(省略：標準 MIT ライセンス本文を入れてください)
```

---

## 9. PM への確認事項（優先度順・回答必要）

1. **Firebase 開発プロジェクトの情報提供**（`firebaseConfig`, Realtime DB URL, サービスアカウントの有無）
2. **Firebase Realtime DB の開発ルール（当面緩めで良いか）** と課金上限／リージョン制約の有無
3. **GitHub リポジトリの作成と開発者への Write 権限付与**（私がIssueを自動作成するために招待を希望）
4. **対戦ログの保持方針（dev：無期限でよいか、本番は何日保持か）**
5. **アセット供給**：card 画像（最低4枚）を PM が用意するか、私が仮のプレースホルダを置くか？
6. **`clientId` 永続化**：localStorage で良いか（削除=新規ユーザー扱いでよいか）
7. **買収成功時の勝利条件**：不動産が 0 になった時点で即勝利で良いか？（基本は「相手の不動産をすべて奪ったプレイヤーの勝利」なので OK だが、同ラウンド両者同時に消滅するケースの優先処理ルール要定義）
8. **CI のマージポリシー**：`dev` に直接マージ可か、PR ベースか（推奨は PR）

---

## 10. 今すぐ欲しいもの（私が作業を始めるため）

* GitHub リポジトリ URL ＋ 招待（Write）
* Firebase `firebaseConfig`（dev） または明確な mock 指示
* 最低 4 枚のカード画像（無ければこちらで仮素材を配置）
* CI ポリシー（PR 必須／未必須）

---

## 11. 次のアクション（推奨手順）

1. PM：GitHub リポジトリ作成、Firebase 情報共有、アセット配置のいずれかを実行
2. プログラマー：モノレポ骨組み作成（Dev-A）→ 共通スキーマ（Dev-B）→ NullAuthAdapter（Dev-C）→ Local Engine（Dev-D）→ Hand UI（Dev-E） まで完了させる
3. 小さい PR を出し、CI とレビューでマージしていく（PR テンプレ・Issue テンプレは作成済み）


## 12. 開発に際して

GEMINIAIは、コードの読み書き・更新を担当します。
GEMINIユーザは、その内容をレビューし、Git操作やそのたパッケージのインストールを行います

また、開発は、Win11の環境で行います

## 補足

*Firebase設定の環境変数管理*:
*フロントエンドのFirebase設定（`firebaseConfig`）は、セキュリティと環境ごとの切り替えの容易さを考慮し、`packages/web-game-client/.env.local`ファイルに`VITE_`プレフィックス付きの環境変数として定義し、コード内で`import.meta.env`を通じてアクセスする方式を採用しました。

*TypeScriptコンパイラオプションの調整*:
*Vite開発サーバー起動時の`SyntaxError`を解決するため、`packages/web-game-client/tsconfig.app.json`内の`"verbatimModuleSyntax"`オプションを`true`から`false`に変更しました。この設定は、モジュール間の互換性を確保するために必要でした。
*テストフレームワークの選定と設定*:

*ユニットテストのフレームワークとしてJestを選定し、`packages/web-game-client/package.json`にテストスクリプトを追加、`packages/web-game-client/jest.config.cjs`で設定を行いました。
*パッケージマネージャーの運用*:
*`GEMINI.md`では`pnpm / yarn workspaces`が推奨されていましたが、`pnpm`が利用できない環境であったため、現状は`npm`を主要なパッケージマネージャーとして使用しています。ルートでのワークスペース設定も`npm`で行いました。


### Firebase起因のエラー防止（State Hydration）

* **内容**: `GameEngine`のコンストラクタに、ゲーム状態オブジェクト内の`hand`、`deck`、`discard`といった配列が必ず存在することを保証する処理を追加しました。
* **理由**: Firebase Realtime Databaseが空の配列を保存しない特性があるため、データベースから取得したゲーム状態ではこれらのプロパティが欠落し、エラーを引き起こす可能性がありました。この「**State Hydration（状態の水分補給）**」処理により、エンジンの安定性が向上しています。

---

### ターン解決の競合状態防止（Mutexロック）

* **内容**: `GameView.tsx`において、`isResolvingTurnRef`というフラグ（Mutex）を導入し、ターンの解決処理が同時に複数回実行されるのを防ぐようにしました。
* **理由**: プレイヤーとNPCのアクションがほぼ同時にデータベースに書き込まれる際、更新通知が複数回トリガーされ、意図せず解決処理が二重に実行される可能性がありました。このロック機構により、ターン解決は必ず一度しか実行されなくなり、動作の信頼性が向上しました。

---

### Phaserへのプレイ済みカード情報の伝達 (`lastActions`)

* **内容**: `GameState`に`lastActions`というプロパティを追加しました。これは、直前のターンでどのカードがプレイされたかを記録するためのものです。
* **理由**: このプロパティをPhaserシーンに渡すことで、どのカード画像を画面中央に表示するかを決定しています。これは、ゲームの視覚的なフィードバックを実現するために不可欠な、設計書にはなかった追加仕様です。

---

### テストカバレッジレポートの導入

* **内容**: フロントエンドのテスト (`jest`) 実行時に、`--coverage`フラグを追加し、テストカバレッジレポートを自動生成するようにCI/CDを構成しました。
* **理由**: これにより、コードのどの部分がテストされていないかを可視化でき、将来的にテストの質を体系的に向上させるための基盤が整いました。

1. Phaser Canvasの統合方法の変更
内容: Reactコンポーネント(GameView.tsx)とPhaserゲームの統合において、Phaserのlaunch関数に文字列IDではなく、ReactのuseRefで取得したDOM要素の参照（HTMLElement）を直接渡す方式に変更しました。

理由: これにより、Phaserがキャンバスを作成するタイミングと場所をより正確に制御できるようになり、Reactのレンダリングサイクルとの間の競合や、Phaserが意図しない場所にキャンバスを作成してしまう問題を解決しました。

2. ゲーム状態のPhaserへの連携強化 (lastActionsの明示的なRegistry設定)
内容: ターン解決後にプレイされたカード情報（lastActions）をPhaserのRegistryに明示的に設定する処理をGameView.tsxのwatchGameStateコールバック内に追加しました。

理由: GameEngineのadvanceTurnメソッドがlastActionsをクリアするタイミングと、Phaserがその情報を読み取るタイミングの間に発生する競合を解消するためです。これにより、Phaserがカードアニメーションを正確にトリガーできるようになりました。

3. 画面全体のスケーリングと中央寄せのロジック
内容: アプリケーション全体（#game-root）を1400x900の固定比率で拡大・縮小し、ブラウザウィンドウの中央に配置するロジックを実装しました。これはmain.tsxのJavaScriptとApp.cssの連携によって実現されています。

理由: 異なる画面サイズで一貫したUI表示を提供し、ユーザー体験を向上させるためです。transform: scale()とtransform: translate()をJavaScriptで一元的に管理することで、CSSとの競合を避け、より堅牢なスケーリングを実現しました。

4. UI要素のレイアウト調整
内容: App.cssにおいて、Appコンポーネント、nav-panel、game-panel、top-bar、player-areaなどの主要なUI要素のFlexboxレイアウトと位置調整を行いました。

理由: ナビゲーションとゲーム画面の視覚的な分離を明確にし、各UI要素が意図した位置に表示されるようにするためです。

