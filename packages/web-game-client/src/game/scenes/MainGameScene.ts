import Phaser from 'phaser';
import { GameState, PlayerState, CardTemplate, ResolvedAction } from '../../types';

export class MainGameScene extends Phaser.Scene {
  private playedCardPlayer?: Phaser.GameObjects.Container;
  private playedCardOpponent?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  init() {
    // The 'gameOver' event is emitted from the React component (GameView.tsx)
    this.game.events.on('gameOver', this.displayGameOverMessage, this);
  }

  preload() {
    this.load.image('card_back', 'images/cards/card_back.jpg');
    this.load.image('COLLECT_FUNDS', 'images/cards/GAIN_FUNDS.jpg'); // Load for the command
  }

  create() {
    console.log('MainGameScene create() called');
    // The main game area is intentionally left blank, as HUDs and player info
    // are now handled by the React UI. This scene is only for card animations
    // and game over messages.

    // Listen for custom event to load card images
    this.game.events.on('loadCardImages', this.loadCardImages, this);
  }

  private loadCardImages() {
    const cardTemplates: { [templateId: string]: CardTemplate } = this.registry.get('cardTemplates');
    if (cardTemplates) {
      for (const templateId in cardTemplates) {
        if (cardTemplates.hasOwnProperty(templateId)) {
          // Only load if not already in cache
          const template = cardTemplates[templateId];
          if (!this.textures.exists(template.templateId)) {
            this.load.image(template.templateId, template.illustPath);
          }
        }
      }
      // Start loading the newly added images
      this.load.start();

      // すべての画像がロード完了した後にイベントを発火
      this.load.once('complete', () => {
        console.log('All card images loaded. Emitting allImagesLoaded event.');
        this.game.events.emit('allImagesLoaded'); // 新しいイベント
      });
    }
  }

  public displayTurnActions(actions: ResolvedAction[] | null) {
    console.log('*** displayTurnActions CALLED ***');
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
    console.log('MainGameScene: Using clientId:', clientId); // Add this log

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

    const gameOverText = this.add.text(width / 2, height / 2 - 50, message, {
      fontSize: '52px', // Reduced font size
      color: color,
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5);
    gameOverText.setDepth(101);

    // --- ここからボタン追加ロジック ---
    const buttonsContainer = this.add.dom(width / 2, height / 2 + 70).createFromHTML(`
      <div class="game-over-buttons">
        <button id="title-screen-button" class="game-over-button">タイトル画面に戻る</button>
        <button id="share-twitter-button" class="game-over-button">X(Twitter)で共有する</button>
      </div>
    `);
    buttonsContainer.setDepth(102);

    // ボタンのクリックイベントリスナー
    buttonsContainer.addListener('click');
    buttonsContainer.on('click', (event: MouseEvent) => {
      if (event.target instanceof HTMLButtonElement) {
        if (event.target.id === 'title-screen-button') {
          console.log('タイトル画面に戻るボタンがクリックされました');
          // TODO: タイトル画面への遷移ロジック
        } else if (event.target.id === 'share-twitter-button') {
          console.log('X(Twitter)で共有するボタンがクリックされました');
          // TODO: X(Twitter)共有ロジック
        }
      }
    });
    // --- ここまでボタン追加ロジック ---
  }

  private displayPlayedCard(templateId: string, playerType: 'player' | 'opponent'): Phaser.GameObjects.Container {
    console.log(`Displaying card ${templateId} for ${playerType}`);
    const { width, height } = this.scale;

    const targetX = playerType === 'player' ? width / 2 + 120 : width / 2 - 120; // Swapped positions
    const targetY = height / 2;
    
    const cardWidth = 200;
    const cardHeight = 400;
    const borderWidth = 6; // Made border thicker
    const borderColor = playerType === 'player' ? 0x00ff00 : 0xff0000; // Green for player, Red for opponent

    // Create a container to hold the card and its border
    const cardContainer = this.add.container(targetX, targetY);
    cardContainer.setAlpha(0);

    // Create the border graphics object
    const border = this.add.graphics();
    border.lineStyle(borderWidth, borderColor, 1);
    border.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
    cardContainer.add(border);

    // Create the card image
    const cardImage = this.add.image(0, 0, 'card_back') // Default to card_back
      .setDisplaySize(cardWidth, cardHeight);
    cardContainer.add(cardImage);

    // Check if the actual card image is already loaded
    if (this.textures.exists(templateId)) {
      cardImage.setTexture(templateId); // If loaded, set it immediately
    } else {
      // If not loaded, listen for its load event
      this.load.once(`filecomplete-image-${templateId}`, () => {
        cardImage.setTexture(templateId); // Set texture once loaded
      });
    }

    // Animate the container
    this.tweens.add({
      targets: cardContainer,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: cardContainer,
          scaleX: 0,
          duration: 200,
          ease: 'Linear',
          onComplete: () => {
            cardImage.setTexture(templateId); // Flip to actual card
            this.tweens.add({
              targets: cardContainer,
              scaleX: 1,
              duration: 200,
              ease: 'Linear'
            });
          }
        });
      }
    });

    return cardContainer;
  }

  update() {
    // Game logic that runs every frame (if needed)
  }
}