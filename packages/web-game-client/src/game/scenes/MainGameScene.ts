import Phaser from 'phaser';
import { GameState, PlayerState, CardTemplate, ResolvedAction } from '../../types';

export class MainGameScene extends Phaser.Scene {
  private playerFundsText?: Phaser.GameObjects.Text;
  private playerPropertiesText?: Phaser.GameObjects.Text;
  private opponentFundsText?: Phaser.GameObjects.Text;
  private opponentPropertiesText?: Phaser.GameObjects.Text;
  private playedCardPlayer?: Phaser.GameObjects.Image;
  private playedCardOpponent?: Phaser.GameObjects.Image;
  // private turnInfoText?: Phaser.GameObjects.Text; // Removed as it's handled by React UI

  private lastPlayerProperties: number = -1;
  private lastOpponentProperties: number = -1;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  init() {
    this.registry.events.on('changedata-gameState', this.updateDisplay, this);
    this.game.events.on('gameOver', this.displayGameOverMessage, this);
  }

  preload() {
    this.load.image('coin_icon', 'images/icons/coin.png');
    this.load.image('property_icon', 'images/icons/property.png');
    this.load.image('card_back', 'images/cards/card_back.jpg');
  }

  create() {
    console.log('MainGameScene create() called');
    const { width, height } = this.scale;

    // Player HUD elements (bottom right)
    this.add.image(width - 100, height - 100, 'coin_icon').setScale(0.1);
    this.playerFundsText = this.add.text(width - 70, height - 115, '0', { fontSize: '24px', color: '#fff' }).setOrigin(0, 0.5);
    this.add.image(width - 100, height - 60, 'property_icon').setScale(0.1);
    this.playerPropertiesText = this.add.text(width - 70, height - 75, '0', { fontSize: '24px', color: '#fff' }).setOrigin(0, 0.5);

    // Opponent HUD elements (top left)
    this.add.image(100, 100, 'coin_icon').setScale(0.1);
    this.opponentFundsText = this.add.text(130, 85, '0', { fontSize: '24px', color: '#fff' }).setOrigin(0, 0.5);
    this.add.image(100, 140, 'property_icon').setScale(0.1);
    this.opponentPropertiesText = this.add.text(130, 125, '0', { fontSize: '24px', color: '#fff' }).setOrigin(0, 0.5);

    this.updateDisplay();
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
      this.registry.set('lastActions', null);
      console.log('--- handleActionsResolved END (Animation Complete) ---');
    });
  }

  // Removed update() method that was observing lastActions, as it's handled by displayTurnActions

  private lastObservedLastActions: ResolvedAction[] | null = null; // This property is no longer strictly needed if update() is removed

  private displayGameOverMessage(message: string, isWin: boolean) {
    console.log('Displaying Game Over message:', message);
    const { width, height } = this.scale;
    const color = isWin ? '#00ff00' : '#ff0000';

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setDepth(100);

    const gameOverText = this.add.text(width / 2, height / 2, message, {
      fontSize: '60px',
      color: color,
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5);
    gameOverText.setDepth(101);
  }

  private updateDisplay() {
    console.log('--- updateDisplay START ---');
    const gameState: GameState | undefined = this.registry.get('gameState');
    const clientId: string | undefined = this.registry.get('clientId');

    if (!gameState || !clientId) {
      // this.playerInfoText?.setText('Waiting for game state...'); // Removed as HUDs are now always visible
      console.log('--- updateDisplay END (No gameState or clientId) ---');
      return;
    }

    const playerState = gameState.players.find(p => p.playerId === clientId);
    const opponentState = gameState.players.find(p => p.playerId !== clientId);

    if (!playerState || !opponentState) {
      console.log('--- updateDisplay END (No playerState or opponentState) ---');
      return;
    }

    // Update player and opponent info text
    this.playerFundsText?.setText(`${playerState.funds}`);
    this.playerPropertiesText?.setText(`${playerState.properties}`);
    this.opponentFundsText?.setText(`${opponentState.funds}`);
    this.opponentPropertiesText?.setText(`${opponentState.properties}`);
    // this.turnInfoText?.setText(`Turn: ${gameState.turn}`); // Removed

    // Property change feedback
    if (this.lastPlayerProperties !== -1 && playerState.properties !== this.lastPlayerProperties) {
      this.showPropertyChange(playerState.properties - this.lastPlayerProperties, 'player');
    }
    if (this.lastOpponentProperties !== -1 && opponentState.properties !== this.lastOpponentProperties) {
      this.showPropertyChange(opponentState.properties - this.lastOpponentProperties, 'opponent');
    }

    this.lastPlayerProperties = playerState.properties;
    this.lastOpponentProperties = opponentState.properties;

    console.log('--- updateDisplay END ---');
  }

  // Removed the duplicate update() method

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

  private showPropertyChange(change: number, playerType: 'player' | 'opponent') {
    console.log(`Property change: ${change} for ${playerType}`);
    const { width, height } = this.scale;
    // Adjusted positions to avoid overlap with HUDs and be more central
    const xPos = width / 2;
    const yPos = playerType === 'player' ? height - 200 : 200; // Closer to center of screen

    const changeText = this.add.text(xPos, yPos, (change > 0 ? '+' : '') + change, {
      fontSize: '30px', // Larger font size
      color: change > 0 ? '#00ff00' : '#ff0000',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: changeText,
      y: yPos - 50, // Float higher
      alpha: 0,
      duration: 1500, // Longer duration
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