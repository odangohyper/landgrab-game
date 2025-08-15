// packages/web-game-client/src/game/scenes/TitleScene.ts

import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  preload() {
    // Load any assets for the title screen here (e.g., background image, logo)
    // For now, we'll just use text.
  }

  create() {
    const { width, height } = this.scale;

    // Add title text
    this.add.text(width / 2, height / 2 - 100, '鹿王院エリザベスの地上げですわ！', {
      fontSize: '64px',
      color: '#00ffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Add start button
    const startButton = this.add.text(width / 2, height / 2 + 50, 'ゲーム開始', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#00bfff',
      padding: { x: 20, y: 10 },
      align: 'center',
    }).setOrigin(0.5).setInteractive();

    startButton.on('pointerover', () => {
      startButton.setStyle({ backgroundColor: '#0099cc' });
    });

    startButton.on('pointerout', () => {
      startButton.setStyle({ backgroundColor: '#00bfff' });
    });

    startButton.on('pointerdown', () => {
      // Emit an event to notify React to start the game
      this.game.events.emit('startGame');
      // Start the main game scene
      this.scene.start('MainGameScene');
    });
  }
}
