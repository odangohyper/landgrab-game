# TODOリスト

| タスク内容 | 状況 | 担当 |
| :--- | :--- | :--- |
| **優先度A（核）** | | |
| 1. モノレポ初期セットアップ (`packages`ディレクトリ作成) | 済 | GEMINIAI |
| 2. 共通スキーマ定義 (`specs/game_state.json`作成) | 済 | GEMINIAI |
| 3. `NullAuthAdapter` の実装 | 済 | GEMINIAI |
| 4. Local Game Engine (TypeScript) とユニットテストの実装 | 済 | GEMINIAI |
| 5. Hand UI (Reactコンポーネント) の実装 | 済 | GEMINIAI |
| **優先度B（順次）** | | |
| 6. Realtime Database ラッパーの実装 | 済 | GEMINIAI |
| 7. NPC AI (重み付け) の実装 | 済 | GEMINIAI |
| 8. Phaser 統合 (ゲーム画面描画) | 済 | GEMINIAI |
| **確認事項・提供物** | | |
| 9. Firebase 開発プロジェクトの情報提供 | 済 | GEMINIユーザ |
| 10. カード画像のアセット供給 (なければ仮作成) | 済 | GEMINIユーザ |
| 11. 相打ち時の勝利条件など詳細なルール定義 | 済 | GEMINIユーザ |

| **フェーズ2以降の主要タスク** | | |
| 12. ゲームロジックの実装 (ターンの進行、カード効果、勝敗判定) | 済 | GEMINIAI |
| 13. カード選択UIのインタラクティブ化とコストチェック | 済 | GEMINIAI |
| 14. Realtime Databaseとのゲーム状態同期 | 済 | GEMINIAI |
| 15. APIサーバーの初期セットアップ (FastAPI) | 済 | GEMINIAI |

| **フェーズ2以降の追加タスク** | | |
| 16. デッキ構築UIの実装 (フロントエンド) | 済 | GEMINIAI |
| 17. カード画像表示の統合 (HandViewなど) | 済 | GEMINIAI |
| 18. Phaserでのゲーム要素描画 (プレイヤー、不動産、場札) | 済 | GEMINIAI |
| 19. デッキ管理APIの実装 (バックエンド) | 済 | GEMINIAI |
| 20. サーバーサイドゲームロジックの骨組み構築 (FastAPI) | 済 | GEMINIAI |
| 21. GitHub Actions CIワークフローの構築 | 済 | GEMINIAI |
| 22. GitHub Actions CIワークフローで実施するテストカバレージの最適化 | 済 | GEMINIAI |

| **フェーズ3以降のタスク (サーバーサイドエンジン)** | | |
| 23a. Python版データ構造の定義 (`models.py`) | 済 | GEMINIAI |
| 23b. Python版カード効果関数の実装 | 済 | GEMINIAI |
| 23c. Python版ゲームエンジン本体の実装 (`engine.py`) | 済 | GEMINIAI |
| 23d. Python版ゲームエンジンのユニットテスト作成 | 済 | GEMINIAI |
| 23e. ゲームエンジンを呼び出すAPIエンドポイント作成 | 済 | GEMINIAI |
| 24. デッキ管理APIのデータベース接続 (Firebase) | 済 | GEMINIAI |
| 25. デッキ構築UIとAPIの統合 | 済 | GEMINIAI |
| 26. NPC AIの改善 (重み付け行動型) | 済 | GEMINIAI |
| 27. UI/UXとPhaserアニメーションの表示設定 | 済 | GEMINIAI |
| 28. UI/UXとPhaserアニメーションの洗練 | 済 | GEMINIAI |
| 29. タイトル画面の実装 | 済 | GEMINIAI |
| 32. ゲームログ表示の実装 | 済 | GEMINIAI |

| **優先順位の低いタスク** | | |
| 30. AudioContext警告の解消と音声機能の追加 | 未 | GEMINIAI |

| **継続課題** | | |
| 33. UI/UXの全体的な再調整とPhaser統合のデバッグ | 未 | GEMINIAI |

| **将来的なアーキテクチャ課題** | | |
| 31. 本格的なセッション管理の実装（ゲーム中断・再接続など） | 未 | GEMINIAI |
