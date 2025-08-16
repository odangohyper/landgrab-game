// packages/web-game-client/src/game/PhaserGame.ts

import Phaser from 'phaser';
import { MainGameScene } from './scenes/MainGameScene';
import { TitleScene } from './scenes/TitleScene'; // Import TitleScene

export const launch = (parentEl: HTMLElement) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentEl,
    backgroundColor: '#282c34', // Dark background
    width: 700,
    height: 540,
    scene: [TitleScene, MainGameScene], // TitleScene is now the first scene
    dom: {
      createContainer: true // ここを追加
    }
  };

  const game = new Phaser.Game(config);
  return game;
};
