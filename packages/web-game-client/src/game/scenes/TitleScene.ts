// packages/web-game-client/src/game/scenes/TitleScene.ts

// Phaserゲームフレームワークをインポートします。
// これにより、Phaserのクラスや機能を利用できます。
import Phaser from 'phaser';

/**
 * TitleSceneクラスは、ゲームのタイトル画面を担当するPhaserのシーンです。
 * プレイヤーがゲームを開始する前の初期画面を表示します。
 */
export class TitleScene extends Phaser.Scene {
  // コンストラクタはシーンの初期設定を行います。
  constructor() {
    // 親クラスのコンストラクタを呼び出し、このシーンにユニークなキーを設定します。
    // このキーを使って、シーンの切り替えなどを行います。
    super({ key: 'TitleScene' });
  }

  /**
   * preloadメソッドは、シーンが開始される前に必要なアセット（画像、音声など）をロードするために使用されます。
   */
  preload() {
    // タイトル画面用の画像をロードします。
    // 'title_image'というキーで画像を識別し、'images/title/main-title.jpg'からファイルを読み込みます。
    this.load.image('title_image', 'images/title/main-title.jpg');
  }

  /**
   * createメソッドは、preloadでアセットがロードされた後に一度だけ呼び出されます。
   * シーンのオブジェクト（テキスト、画像、ボタンなど）を配置し、インタラクティブ性を設定します。
   */
  create() {
    // ゲームキャンバスの幅と高さを取得します。これを使って要素を中央に配置したり、スケールを調整したりします。
    const { width, height } = this.scale;

    // タイトルテキストを画面に追加します。
    // X座標は幅の半分 (中央)、Y座標は高さの半分から上にずらして配置します。
    this.add.text(width / 2, height / 2 - 220, '鹿王院エリザベスの地上げですわ！', {
      // フォントファミリーを指定します。
      fontFamily: '"Yuji Syuku"',
      // フォントサイズを設定します。
      fontSize: '40px',
      // 文字色を設定します。
      color: '#00ffff',
      // テキストの水平アラインメントを中央に設定します。
      align: 'center',
      // 文字のアウトライン（縁取り）色を設定します。
      stroke: '#000000',
      // 文字のアウトラインの太さを設定します。
      strokeThickness: 8,
    }).setOrigin(0.5); // テキストの原点を中央に設定し、X/Y座標に対してテキストが中央揃えになるようにします。

    // タイトル画像を画面に追加します。
    // 画像はキャンバスの中央に配置されます。
    const titleImage = this.add.image(width / 2, height / 2, 'title_image');
    // 画像の表示幅をキャンバス幅の60%に設定して、きれいに収まるようにスケールします。
    titleImage.displayWidth = width * 0.78; // キャンバス幅の60%
    // アスペクト比を維持するために、YスケールをXスケールに合わせます。
    titleImage.scaleY = titleImage.scaleX; // アスペクト比を維持

    // --- スタイル付きボタンの作成 ---
    // ボタンのY座標を計算します。
    const buttonY = height / 2 + 220;
    // ボタンに表示するテキストを定義します。
    const buttonText = 'NPCと対戦！';
    // ボタンテキストのスタイルを定義します。
    const buttonTextStyle = {
        font: 'bold 24px sans-serif', // フォントの太さとサイズ、フォントファミリーをCSSのように指定
        color: '#1a1a1a' // 文字色
    };

    // ボタンの背景サイズを正確に計算するために、一時的なテキストオブジェクトを作成します。
    // このテキストは画面には表示されません。
    const tempText = this.add.text(0, 0, buttonText, buttonTextStyle).setVisible(false);
    // ボタンのパディング（内側の余白）を設定します。
    const padding = { x: 40, y: 20 }; // パディングを増やす
    // テキストの幅とパディングを考慮してボタンの幅を計算します。
    const buttonWidth = tempText.width + padding.x * 2;
    // テキストの高さとパディングを考慮してボタンの高さを計算します。
    const buttonHeight = tempText.height + padding.y * 2;
    // 一時的なテキストオブジェクトは不要になったため破棄します。
    tempText.destroy();

    // ボタンの要素をまとめるためのPhaserコンテナを作成します。
    // コンテナの原点は中心に設定され、その子要素はコンテナに対して相対的に配置されます。
    const startButtonContainer = this.add.container(width / 2, buttonY);

    // ボタンの背景図形を作成します。PhaserのGraphicsオブジェクトを使用します。
    const buttonBackground = this.add.graphics();
    // 背景色を設定します（明るい青色）。
    buttonBackground.fillStyle(0x00bfff, 1);
    // 角丸の長方形を描画します。座標はコンテナの中心を基準とし、角の半径を指定します。
    buttonBackground.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 12); // border-radius
    // 背景図形をボタンコンテナに追加します。
    startButtonContainer.add(buttonBackground);

    // ボタンのテキストを作成します。
    const text = this.add.text(0, 0, buttonText, buttonTextStyle).setOrigin(0.5); // テキストを中央揃え
    // テキストをボタンコンテナに追加します。
    startButtonContainer.add(text);

    // コンテナをインタラクティブにし、クリックイベントなどを受け取れるようにします。
    startButtonContainer.setSize(buttonWidth, buttonHeight);
    // マウスカーソルを手のアイコンに変更し、クリック可能であることを視覚的に示します。
    startButtonContainer.setInteractive({ useHandCursor: true });

    // ボタンのイベントリスナーを追加します。
    // マウスポインタがボタンに乗ったときの処理。
    startButtonContainer.on('pointerover', () => {
      // 背景色を少し暗い青に変更します。
      buttonBackground.fillStyle(0x0099cc, 1); 
      // 背景図形を再描画して色の変更を反映させます。
      buttonBackground.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 12);
    });

    // マウスポインタがボタンから離れたときの処理。
    startButtonContainer.on('pointerout', () => {
      // 背景色を元の明るい青に戻します。
      buttonBackground.fillStyle(0x00bfff, 1); 
      // 背景図形を再描画します。
      buttonBackground.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 12);
    });

    // ボタンがクリック（またはタップ）されたときの処理。
    startButtonContainer.on('pointerdown', () => {
      // Reactコンポーネントにゲーム開始を通知するカスタムイベントを発行します。
      this.game.events.emit('startGame');
      // メインゲームシーンを開始します。
      this.scene.start('MainGameScene');
    });
  }
}
