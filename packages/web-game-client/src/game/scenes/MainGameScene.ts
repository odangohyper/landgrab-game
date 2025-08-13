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
  }

  create() {
    const { width, height } = this.scale;

    // Player (bottom) HUD elements
    this.add.image(width / 2 - 100, height - 50, 'coin_icon').setScale(0.1).setOrigin(0.5);
    this.playerInfoText = this.add.text(width / 2 - 50, height - 50, '', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'left'
    }).setOrigin(0, 0.5);
    this.add.image(width / 2 + 50, height - 50, 'property_icon').setScale(0.1).setOrigin(0.5);
    this.playerPropertiesText = this.add.text(width / 2 + 100, height - 50, '', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'left'
    }).setOrigin(0, 0.5);

    // Opponent (top) HUD elements
    this.add.image(width / 2 - 100, 50, 'coin_icon').setScale(0.1).setOrigin(0.5);
    this.opponentInfoText = this.add.text(width / 2 - 50, 50, '', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'left'
    }).setOrigin(0, 0.5);
    this.add.image(width / 2 + 50, 50, 'property_icon').setScale(0.1).setOrigin(0.5);
    this.opponentPropertiesText = this.add.text(width / 2 + 100, 50, '', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'left'
    }).setOrigin(0, 0.5);
    
    // Turn Info
    this.turnInfoText = this.add.text(width - 10, 10, '', {
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
    const yPos = playerType === 'player' ? height / 2 + 80 : height / 2 - 80;
    
    const cardImage = this.add.image(width / 2, yPos, templateId)
      .setScale(0.5) // Adjust scale as needed
      .setAlpha(0);

    // Fade-in tween
    this.tweens.add({
      targets: cardImage,
      alpha: 1,
      duration: 500,
    });

    return cardImage;
  }

  update() {
    // Game logic that runs every frame (if needed)
  }
}