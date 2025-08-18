// packages/web-game-client/src/game/PhaserGame.ts

import Phaser from 'phaser';
import { MainGameScene } from './scenes/MainGameScene';
import { TitleScene } from './scenes/TitleScene';
import { CardTemplate } from '../types';

export const launch = (parentEl: HTMLElement, cardTemplates: { [id: string]: CardTemplate }) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentEl,
    backgroundColor: '#282c34',
    width: 700,
    height: 540,
    scene: [TitleScene, MainGameScene],
    dom: {
      createContainer: true
    }
  };

  const game = new Phaser.Game(config);

  // Pass card templates to the MainGameScene via the registry
  game.registry.set('cardTemplates', cardTemplates);

  return game;
};
