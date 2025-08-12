// packages/web-game-client/src/game/scenes/MainGameScene.ts

import Phaser from 'phaser';

export class MainGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainGameScene' });
  }

  preload() {
    // Load assets here
    // Example: this.load.image('card_back', 'assets/card_back.png');
    // For now, we'll assume card images are loaded dynamically or via a preloader scene
  }

  create() {
    // Create game objects here
    this.add.text(400, 300, 'Hello Phaser!', { fontSize: '50px', color: '#ffffff' }).setOrigin(0.5);

    // Example: Display a card image (assuming it's loaded)
    // const card = this.add.image(100, 100, 'card_back');
    // card.setInteractive();
    // this.input.setDraggable(card);

    // this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
    //   gameObject.x = dragX;
    //   gameObject.y = dragY;
    // });
  }

  update() {
    // Game logic that runs every frame
  }
}
