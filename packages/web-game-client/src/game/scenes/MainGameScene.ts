import Phaser from 'phaser';
import { GameState, PlayerState, CardTemplate, ResolvedAction } from '../../types';

export class MainGameScene extends Phaser.Scene {
  private playedCardPlayer?: Phaser.GameObjects.Image;
  private playedCardOpponent?: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  init() {
    // The 'gameOver' event is emitted from the React component (GameView.tsx)
    this.game.events.on('gameOver', this.displayGameOverMessage, this);
  }

  preload() {
    // Preload card backs or other shared assets
    this.load.image('card_back', 'images/cards/card_back.jpg');
  }

  create() {
    console.log('MainGameScene create() called');
    // The main game area is intentionally left blank, as HUDs and player info
    // are now handled by the React UI. This scene is only for card animations
    // and game over messages.
  }

  public displayTurnActions(actions: ResolvedAction[] | null) {
    console.log('--- displayTurnActions START ---');
    console.log('Parameter "actions":', actions);

    const currentActions = actions;

    console.log('displayTurnActions: Triggered with actions:', currentActions);
    const clientId: string | undefined = this.registry.get('clientId');
    if (!clientId) {
        console.log('displayTurnActions: clientId not found.');
        console.log('--- displayTurnActions END (No clientId) ---');
        return;
    }

    if (!currentActions || currentActions.length === 0) {
        console.log('handleActionsResolved: currentActions is null or empty, cannot display cards.');
        console.log('--- handleActionsResolved END (Actions null/empty) ---');
        return;
    }

    this.playedCardPlayer?.destroy();
    this.playedCardOpponent?.destroy();
    this.playedCardPlayer = undefined;
    this.playedCardOpponent = undefined;

    console.log('handleActionsResolved: currentActions:', currentActions);

    const playerAction = currentActions.find(a => a.playerId === clientId);
    const opponentAction = currentActions.find(a => a.playerId !== clientId);

    console.log('handleActionsResolved: playerAction:', playerAction);
    console.log('handleActionsResolved: opponentAction:', opponentAction);

    if (playerAction) {
      console.log('Displaying player action', playerAction.cardTemplateId);
      this.playedCardPlayer = this.displayPlayedCard(playerAction.cardTemplateId, 'player');
    }
    if (opponentAction) {
      console.log('Displaying opponent action', opponentAction.cardTemplateId);
      this.playedCardOpponent = this.displayPlayedCard(opponentAction.cardTemplateId, 'opponent');
    }

    this.time.delayedCall(2000, () => {
      console.log('Animation complete, emitting event to React.');
      this.game.events.emit('animationComplete');
      console.log('--- handleActionsResolved END (Animation Complete) ---');
    });
  }

  private displayGameOverMessage(message: string, isWin: boolean) {
    console.log('Displaying Game Over message:', message);
    const { width, height } = this.scale;
    const color = isWin ? '#00ff00' : '#ff0000';

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setDepth(100);

    const gameOverText = this.add.text(width / 2, height / 2, message, {
      fontSize: '52px', // Reduced font size
      color: color,
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5);
    gameOverText.setDepth(101);
  }

  private displayPlayedCard(templateId: string, playerType: 'player' | 'opponent'): Phaser.GameObjects.Image {
    console.log(`Displaying card ${templateId} for ${playerType}`);
    const { width, height } = this.scale;

    const targetX = playerType === 'player' ? width / 2 - 100 : width / 2 + 100;
    const targetY = height / 2;

    const cardImage = this.add.image(targetX, targetY, 'card_back')
      .setScale(0.55)
      .setAlpha(0);

    this.tweens.add({
      targets: cardImage,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: cardImage,
          scaleX: 0,
          duration: 200,
          ease: 'Linear',
          onComplete: () => {
            const flipCard = () => {
              cardImage.setTexture(templateId);
              this.tweens.add({
                targets: cardImage,
                scaleX: 0.5,
                duration: 200,
                ease: 'Linear'
              });
            };

            if (!this.textures.exists(templateId)) {
              this.load.image(templateId, `images/cards/${templateId}.jpg`);
              this.load.once(`filecomplete-image-${templateId}`, flipCard);
              this.load.start();
            } else {
              flipCard();
            }
          }
        });
      }
    });

    return cardImage;
  }

  update() {
    // Game logic that runs every frame (if needed)
  }
}