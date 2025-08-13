// packages/web-game-client/src/game/scenes/MainGameScene.ts

import Phaser from 'phaser';
import { GameState, PlayerState, CardTemplate, Action } from '../../types';

export class MainGameScene extends Phaser.Scene {
  private playerInfoText?: Phaser.GameObjects.Text;
  private playerPropertiesText?: Phaser.GameObjects.Text;
  private opponentInfoText?: Phaser.GameObjects.Text;
  private opponentPropertiesText?: Phaser.GameObjects.Text;
  private playedCardPlayer?: Phaser.GameObjects.Image;
  private playedCardOpponent?: Phaser.GameObjects.Image;
  private turnInfoText?: Phaser.GameObjects.Text;

  private lastRenderedTurn: number = -1;
  private lastPlayerProperties: number = -1;
  private lastOpponentProperties: number = -1;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  init() {
    // Listen for changes in the registry
    this.registry.events.on('changedata', this.updateDisplay, this);
  }

  preload() {
    // Dynamically load card images based on templates from the registry
    const cardTemplates: { [templateId: string]: CardTemplate } = this.registry.get('cardTemplates') || {};
    for (const templateId in cardTemplates) {
      const template = cardTemplates[templateId];
      this.load.image(template.templateId, `images/cards/${template.templateId}.jpg`);
    }

    // Load placeholder icons
    this.load.image('coin_icon', 'images/icons/coin.png');
    this.load.image('property_icon', 'images/icons/property.png');
    this.load.image('card_back', 'images/cards/card_back.jpg'); // Load card back image
  }

  create() {
    const { width, height } = this.scale;

    // Player (bottom) HUD elements
    // this.add.image(width / 2 - 100, height - 50, 'coin_icon').setScale(0.1).setOrigin(0.5);
    // this.playerInfoText = this.add.text(width / 2 - 50, height - 50, '', {
    //   fontSize: '24px',
    //   color: '#ffffff',
    //   align: 'left'
    // }).setOrigin(0, 0.5);
    // this.add.image(width / 2 + 50, height - 50, 'property_icon').setScale(0.1).setOrigin(0.5);
    // this.playerPropertiesText = this.add.text(width / 2 + 100, height - 50, '', {
    //   fontSize: '24px',
    //   color: '#ffffff',
    //   align: 'left'
    // }).setOrigin(0, 0.5);

    // Opponent (top) HUD elements
    // this.add.image(width / 2 - 100, 50, 'coin_icon').setScale(0.1).setOrigin(0.5);
    // this.opponentInfoText = this.add.text(width / 2 - 50, 50, '', {
    //   fontSize: '24px',
    //   color: '#ffffff',
    //   align: 'left'
    // }).setOrigin(0, 0.5);
    // this.add.image(width / 2 + 50, 50, 'property_icon').setScale(0.1).setOrigin(0.5);
    // this.opponentPropertiesText = this.add.text(width / 2 + 100, 50, '', {
    //   fontSize: '24px',
    //   color: '#ffffff',
    //   align: 'left'
    // }).setOrigin(0, 0.5);
    
    // Turn Info
    this.turnInfoText = this.add.text(width - 20, 10, '', {
        fontSize: '20px',
        color: '#dddddd',
        align: 'right'
      }).setOrigin(1, 0);


    // Initial display update
    this.updateDisplay();
  }

  private updateDisplay() {
    const gameState: GameState | undefined = this.registry.get('gameState');
    const clientId: string | undefined = this.registry.get('clientId');

    if (!gameState || !clientId) {
      this.playerInfoText?.setText('Waiting for game state...');
      return;
    }

    const playerState = gameState.players.find(p => p.playerId === clientId);
    const opponentState = gameState.players.find(p => p.playerId !== clientId);

    if (!playerState || !opponentState) return;

    // Update player and opponent info text
    this.playerInfoText?.setText(`${playerState.funds}`);
    this.playerPropertiesText?.setText(`${playerState.properties}`);
    this.opponentInfoText?.setText(`${opponentState.funds}`);
    this.opponentPropertiesText?.setText(`${opponentState.properties}`);
    this.turnInfoText?.setText(`Turn: ${gameState.turn}`);

    // Property change feedback
    if (this.lastPlayerProperties !== -1 && playerState.properties !== this.lastPlayerProperties) {
      this.showPropertyChange(playerState.properties - this.lastPlayerProperties, 'player');
    }
    if (this.lastOpponentProperties !== -1 && opponentState.properties !== this.lastOpponentProperties) {
      this.showPropertyChange(opponentState.properties - this.lastOpponentProperties, 'opponent');
    }

    this.lastPlayerProperties = playerState.properties;
    this.lastOpponentProperties = opponentState.properties;

    // Game Over message
    if (gameState.phase === 'GAME_OVER') {
      const { width, height } = this.scale;
      const message = playerState.properties > 0 ? 'You Win!' : 'You Lose!';
      const color = playerState.properties > 0 ? '#00ff00' : '#ff0000';

      // Add a semi-transparent overlay
      const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
      overlay.setDepth(100); // Ensure it's on top

      const gameOverText = this.add.text(width / 2, height / 2, message, {
        fontSize: '60px',
        color: color,
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center'
      }).setOrigin(0.5);
      gameOverText.setDepth(101); // Ensure text is on top of overlay
    }

    // Show played cards on turn resolution
    if (gameState.turn > this.lastRenderedTurn) {
        this.lastRenderedTurn = gameState.turn;
        
        // Clear previously played cards after a short delay
        if(this.playedCardPlayer) {
            this.tweens.add({
                targets: [this.playedCardPlayer, this.playedCardOpponent],
                alpha: 0,
                duration: 500,
                delay: 1500, // Wait 1.5 seconds before fading
                onComplete: () => {
                    this.playedCardPlayer?.destroy();
                    this.playedCardOpponent?.destroy();
                    this.playedCardPlayer = undefined;
                    this.playedCardOpponent = undefined;
                }
            });
        }

        // Display newly played cards if there are actions from the previous state
        if (gameState.lastActions) {
            const playerAction = gameState.lastActions.find(a => a.playerId === clientId);
            const opponentAction = gameState.lastActions.find(a => a.playerId !== clientId);

            if (playerAction) {
                this.playedCardPlayer = this.displayPlayedCard(playerAction.cardTemplateId, 'player');
            }
            if (opponentAction) {
                this.playedCardOpponent = this.displayPlayedCard(opponentAction.cardTemplateId, 'opponent');
            }
        }
    }
  }

  private displayPlayedCard(templateId: string, playerType: 'player' | 'opponent'): Phaser.GameObjects.Image {
    const { width, height } = this.scale;
    
    // Initial positions (conceptual hand area)
    const startX = width / 2;
    const startY = playerType === 'player' ? height + 100 : -100; // Off-screen bottom or top

    // Target position (center of the screen)
    const targetX = width / 2;
    const targetY = height / 2;

    // Create card image (initially face down)
    const cardImage = this.add.image(startX, startY, 'card_back')
      .setScale(0.5) // Adjust scale as needed
      .setAlpha(0);

    // Tween for movement and fade-in
    this.tweens.add({
      targets: cardImage,
      x: targetX,
      y: targetY,
      alpha: 1,
      duration: 500, // Movement duration
      ease: 'Power2',
      onComplete: () => {
        // Flip animation after reaching center
        this.tweens.add({
          targets: cardImage,
          scaleX: 0, // Shrink to 0 width
          ease: 'Linear',
          duration: 250,
          onComplete: () => {
            cardImage.setTexture(templateId); // Change texture in the middle of the flip
            this.tweens.add({
              targets: cardImage,
              scaleX: 0.5, // Expand back to original width
              ease: 'Linear',
              duration: 250,
            });
          },
        });
      },
    });

    return cardImage;
  }

  private showPropertyChange(change: number, playerType: 'player' | 'opponent') {
    const { width, height } = this.scale;
    const xPos = playerType === 'player' ? width / 2 + 150 : width / 2 + 150; // Near property icon
    const yPos = playerType === 'player' ? height - 50 : 50;

    const changeText = this.add.text(xPos, yPos, (change > 0 ? '+' : '') + change, {
      fontSize: '20px',
      color: change > 0 ? '#00ff00' : '#ff0000', // Green for gain, red for loss
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: changeText,
      y: yPos - 30, // Move up
      alpha: 0, // Fade out
      duration: 1000,
      ease: 'Power1',
      onComplete: () => {
        changeText.destroy();
      },
    });
  }

  update() {
    // Game logic that runs every frame (if needed)
  }
}
