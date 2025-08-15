// ESLintの設定ファイルです。コードの品質とスタイルを維持するために使用されます。

// ESLintのJavaScript設定をインポートします。
import js from '@eslint/js';
// グローバル変数定義を扱うためのライブラリをインポートします。
import globals from 'globals';
// React Hooks用のESLintプラグインをインポートします。
import reactHooks from 'eslint-plugin-react-hooks';
// React Fast Refresh（HMR）用のESLintプラグインをインポートします。
import reactRefresh from 'eslint-plugin-react-refresh';
// TypeScript用のESLint設定をインポートします。
import tseslint from 'typescript-eslint';
// グローバルな無視パターンを扱うためのユーティリティをインポートします。
import { globalIgnores } from 'eslint/config';

// ESLintの設定をエクスポートします。tseslint.configは新しい設定形式です。
export default tseslint.config([
  // `dist`ディレクトリをグローバルに無視する設定です。
  // ビルドされたファイルは通常リンティングの対象外です。
  globalIgnores(['dist']),
  {
    // この設定が適用されるファイルを指定します。ここではTypeScriptおよびTSXファイルが対象です。
    files: ['**/*.{ts,tsx}'],
    // 拡張設定（他の設定ファイルやプラグインのルールセット）を適用します。
    extends: [
      js.configs.recommended, // ESLintの推奨JavaScriptルール
      tseslint.configs.recommended, // TypeScript ESLintの推奨ルール
      reactHooks.configs['recommended-latest'], // React Hooksの最新推奨ルール
      reactRefresh.configs.vite, // Vite環境でのReact Fast Refreshルール
    ],
    // 言語に関するオプションを設定します。
    languageOptions: {
      // 使用するECMAScriptのバージョンを指定します。
      ecmaVersion: 2020,
      // コード内で使用されるグローバル変数を定義します。
      // ここではブラウザ環境のグローバル変数を許可します（例: window, document）。
      globals: globals.browser,
    },
    // 将来的に追加される可能性のあるルールやプラグインオプションはここに追加できます。
    // rules: { ... }
    // plugins: { ... }
  },
]);
