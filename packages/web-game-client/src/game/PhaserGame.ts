// packages/web-game-client/src/game/PhaserGame.ts

import Phaser from 'phaser';
import { MainGameScene } from './scenes/MainGameScene';

export const launch = (parentEl: HTMLElement) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentEl,
    backgroundColor: '#282c34', // Dark background
    width: 700,
    height: 500,
    scene: [MainGameScene],
  };

  const game = new Phaser.Game(config);
  return game;
};
