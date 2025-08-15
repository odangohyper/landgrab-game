// packages/web-game-client/src/game/PhaserGame.ts

import Phaser from 'phaser';
import { MainGameScene } from './scenes/MainGameScene';
import { TitleScene } from './scenes/TitleScene'; // Import TitleScene

export const launch = (parentEl: HTMLElement) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentEl,
    backgroundColor: '#282c34', // Dark background
    scene: [TitleScene, MainGameScene], // TitleScene is now the first scene
    scale: {
      mode: Phaser.Scale.FIT, // Fit the game within the parent container
      autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game horizontally and vertically
      parent: parentEl, // Explicitly set the parent for scaling
      width: '100%', // Base width for scaling calculations
      height: '100%', // Base height for scaling calculations
    },
  };

  const game = new Phaser.Game(config);
  return game;
};
