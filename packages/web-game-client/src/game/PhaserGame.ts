// packages/web-game-client/src/game/PhaserGame.ts

import Phaser from 'phaser';
import { MainGameScene } from './scenes/MainGameScene';

export const launch = (containerId: string) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: containerId,
    backgroundColor: '#282c34', // Dark background
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 800,
      height: 600,
    },
    scene: [MainGameScene],
  };

  const game = new Phaser.Game(config);
  return game;
};
