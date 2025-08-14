// packages/web-game-client/src/game/scenes/MainGameScene.ts

import Phaser from 'phaser';
import { GameState, PlayerState, CardTemplate, ResolvedAction } from '../../types';

export class MainGameScene extends Phaser.Scene {
  private playerInfoText?: Phaser.GameObjects.Text;
  private playerPropertiesText?: Phaser.GameObjects.Text;
  private opponentInfoText?: Phaser.GameObjects.Text;
  private opponentPropertiesText?: Phaser.GameObjects.Text;
  private playedCardPlayer?: Phaser.GameObjects.Image;
  private playedCardOpponent?: Phaser.GameObjects.Image;
  private turnInfoText?: Phaser.GameObjects.Text;

  private lastPlayerProperties: number = -1;
  private lastOpponentProperties: number = -1;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  init() {
    // Listen for general data changes for HUD updates
    this.registry.events.on('changedata-gameState', this.updateDisplay, this);
    // Listen for the game over event from React
    this.game.events.on('gameOver', this.displayGameOverMessage, this);
  }

  preload() {
    // Load placeholder icons
    this.load.image('coin_icon', 'images/icons/coin.png');
    this.load.image('property_icon', 'images/icons/property.png');
    this.load.image('card_back', 'images/cards/card_back.jpg'); // Load card back image
  }

  create() {
    console.log('MainGameScene create() called');
    // Initial display update
    this.updateDisplay();
  }

  public displayTurnActions(actions: ResolvedAction[] | null) { // 引数を修正
    console.log('--- displayTurnActions START ---');
    console.log('Parameter "actions":', actions); // value をログ出力

    const currentActions = actions; // value が新しい lastActions の値

    console.log('displayTurnActions: Triggered with actions:', currentActions); // ログを修正
    const clientId: string | undefined = this.registry.get('clientId');
    if (!clientId) {
        console.log('displayTurnActions: clientId not found.');
        console.log('--- displayTurnActions END (No clientId) ---');
        return;
    }

    // actionsがnullの場合のガードを追加 (currentActionsを使用)
    if (!currentActions || currentActions.length === 0) { // actions.length === 0 のチェックも追加
        console.log('handleActionsResolved: currentActions is null or empty, cannot display cards.');
        console.log('--- handleActionsResolved END (Actions null/empty) ---');
        return;
    }

    // Clear previously played cards immediately before showing new ones
    this.playedCardPlayer?.destroy();
    this.playedCardOpponent?.destroy();
    this.playedCardPlayer = undefined;
    this.playedCardOpponent = undefined;

    console.log('handleActionsResolved: currentActions:', currentActions); // 追加ログ

    const playerAction = currentActions.find(a => a.playerId === clientId);
    const opponentAction = currentActions.find(a => a.playerId !== clientId);

    console.log('handleActionsResolved: playerAction:', playerAction); // 追加ログ
    console.log('handleActionsResolved: opponentAction:', opponentAction); // 追加ログ

    if (playerAction) {
      console.log('Displaying player action', playerAction.cardTemplateId);
      this.playedCardPlayer = this.displayPlayedCard(playerAction.cardTemplateId, 'player');
    }
    if (opponentAction) {
      console.log('Displaying opponent action', opponentAction.cardTemplateId);
      this.playedCardOpponent = this.displayPlayedCard(opponentAction.cardTemplateId, 'opponent');
    }

    // ... (既存のコード)

    // After a delay to let animations play, emit an event to React
    this.time.delayedCall(2000, () => {
      console.log('Animation complete, emitting event to React.');
      this.game.events.emit('animationComplete');
      this.registry.set('lastActions', null);
      console.log('--- handleActionsResolved END (Animation Complete) ---');
    });
  }

  update() {
    // Game logic that runs every frame (if needed)
    // **修正点2: updateメソッドでlastActionsを監視**
    const currentLastActions = this.registry.get('lastActions');
    if (currentLastActions !== this.lastObservedLastActions) {
        console.log('Update: lastActions changed to:', currentLastActions);
        this.lastObservedLastActions = currentLastActions;
    }
  }

  private lastObservedLastActions: ResolvedAction[] | null = null; // 新しいプロパティを追加

  private displayGameOverMessage(message: string, isWin: boolean) {
    console.log('Displaying Game Over message:', message);
    const { width, height } = this.scale;
    const color = isWin ? '#00ff00' : '#ff0000';

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

  private updateDisplay() {
    console.log('--- updateDisplay START ---');
    const gameState: GameState | undefined = this.registry.get('gameState');
    const clientId: string | undefined = this.registry.get('clientId');

    if (!gameState || !clientId) {
      this.playerInfoText?.setText('Waiting for game state...');
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

    console.log('--- updateDisplay END ---');
  }

  update() {
    // Game logic that runs every frame (if needed)
    const currentLastActions = this.registry.get('lastActions');
    if (currentLastActions !== this.lastObservedLastActions) {
        console.log('Update: lastActions changed to:', currentLastActions);
        this.lastObservedLastActions = currentLastActions;
    }
  }

  private displayPlayedCard(templateId: string, playerType: 'player' | 'opponent'): Phaser.GameObjects.Image {
    console.log(`Displaying card ${templateId} for ${playerType}`);
    const { width, height } = this.scale;

    const targetX = playerType === 'player' ? width / 2 - 100 : width / 2 + 100;
    const targetY = height / 2;

    // Start with the back of the card, slightly scaled up and transparent
    const cardImage = this.add.image(targetX, targetY, 'card_back')
      .setScale(0.55)
      .setAlpha(0);

    // Fade in the card back
    this.tweens.add({
      targets: cardImage,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        // After fade in, start the flip
        this.tweens.add({
          targets: cardImage,
          scaleX: 0,
          duration: 200,
          ease: 'Linear',
          onComplete: () => {
            // At the point of being invisible, switch the texture
            const flipCard = () => {
              cardImage.setTexture(templateId);
              // Then, flip it back to normal scale
              this.tweens.add({
                targets: cardImage,
                scaleX: 0.5,
                duration: 200,
                ease: 'Linear'
              });
            };

            // Check if the texture already exists. If not, load it.
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
    const xPos = playerType === 'player' ? width / 2 + 150 : width / 2 + 150;
    const yPos = playerType === 'player' ? height - 50 : 50;

    const changeText = this.add.text(xPos, yPos, (change > 0 ? '+' : '') + change, {
      fontSize: '20px',
      color: change > 0 ? '#00ff00' : '#ff0000',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: changeText,
      y: yPos - 30,
      alpha: 0,
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
