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

| **フェーズ2のタスク** | | |
| 12. ゲームロジックの実装 (ターンの進行、カード効果、勝敗判定) | 済 | GEMINIAI |
| 13. カード選択UIのインタラクティブ化とコストチェック | 済 | GEMINIAI |
| 14. Realtime Databaseとのゲーム状態同期 | 済 | GEMINIAI |
| 15. APIサーバーの初期セットアップ (FastAPI) | 済 | GEMINIAI |
| 16. デッキ構築UIの実装 (フロントエンド) | 済 | GEMINIAI |
| 17. カード画像表示の統合 (HandViewなど) | 済 | GEMINIAI |
| 18. Phaserでのゲーム要素描画 (プレイヤー、不動産、場札) | 済 | GEMINIAI |
| 19. デッキ管理APIの実装 (バックエンド) | 済 | GEMINIAI |
| 20. サーバーサイドゲームロジックの骨組み構築 (FastAPI) | 済 | GEMINIAI |
| 21. GitHub Actions CIワークフローの構築 | 済 | GEMINIAI |
| 22. GitHub Actions CIワークフローで実施するテストカバレージの最適化 | 済 | GEMINIAI |

| **フェーズ3のタスク (サーバーサイドエンジン)** | | |
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
| 33. UI/UXの全体的な再調整とPhaser統合のデバッグ | 済 | GEMINIAI |


| **フェーズ4: アニメーションと視覚効果の改善** | | |
| 36. カード描画サイズの統一 (200x400) | 済 | GEMINIAI |
| 37. カード縁取りによる所属の明示化 (プレイヤー:緑、敵:赤) | 済 | GEMINIAI |

| **フェーズ5: タイトル画面の改善** | | |
| 38. タイトルロゴのフォント変更 | 済 | GEMINIAI |
| 39. タイトル画面へのメイン画像表示 | 済 | GEMINIAI |
| 40. 「ゲーム開始」ボタンのスタイル変更 | 済 | GEMINIAI |

| **フェーズ5.5: UI改善** | | |
| 50. ゲームログの改善 | 済 | GEMINIAI |
| 45. ゲーム終了後のリトライボタンとSNS共有ボタンの設置(ロジックは未実装) | 済 | GEMINIAI |
| 46. 残りデッキ枚数と捨て札エリアの実装 | 済 | GEMINIAI |
| 47. 残りデッキ内容(順番は非公開情報)と捨て札内容の確認機能の実装 | 未 | GEMINIAI |
| 53. 手札を捨て札にする処理の実装 | 済 | GEMINIAI |
| 54. 「賄賂」カード(コスト5で、詐欺や防衛を無視して不動産を奪う効果)の実装 | 済 | GEMINIAI |
| 58. 「投資」カード(コスト1で、資金3を獲得する効果)の実装 | 済 | GEMINIAI |
| 45. ゲーム終了後のリトライボタンとSNS共有ボタンのクリック時挙動を実装 | 未 | GEMINIAI |
| 60. 賄賂と投資カードのイラスト用意 | 未 | GEMINIAI |
| 57. 構築したデッキでの対戦機能 | 未 | GEMINIAI |

| **フェーズ6: セッション管理とその他UIの調整** | | |
| 31. 本格的なセッション管理の実装（ゲーム中断・再接続など） | 未 | GEMINIAI |
| 35. UI/UXの改善 | 済 | GEMINIAI |
| 34. ゲームバランスの調整 | 済 | GEMINIユーザ |
| 43. hand-containerのUI改善と選択解除の可能化 | 済 | GEMINIAI |
| 44. 常に動作可能な「資金集め」ボタンの実装 | 済 | GEMINIAI |
| 59. 「調査」カード(コスト1で、次のターンに山札から1枚を確実に獲得できる)の実装 | 未 | GEMINIAI |


| **フェーズ6.5: UI改善** | | |
| 48. 敵NPCのバリエーション実装(UIおよびカード選択AI) | 未 | GEMINIAI |
| 52. NPCのAIロジック改善 | 未 | GEMINIAI |
| 49. 未実装の機能への工事中アニメ実装 | 未 | GEMINIAI |
| 51. Firebaseへの暫定版デプロイ | 未 | GEMINIAI |
| 55. ファビコンとOGPの実装 | 未 | GEMINIAI |
| 56. SEOおよびAIOの実施 | 未 | GEMINIAI |


| **フェーズ7: UX改善のための作業** | | |
| 41. 画像素材の準備、解像度調整 | 未 | GEMINIユーザ |
| 42. プロローグとチュートリアルの実装 | 未 | GEMINIユーザ・GEMINIAI |

| **優先順位の低いタスク** | | |
| 30. AudioContext警告の解消と音声機能の追加 | 未 | GEMINIAI |
| 57. Googleアドセンスの実装 | 未 | GEMINIAI |
