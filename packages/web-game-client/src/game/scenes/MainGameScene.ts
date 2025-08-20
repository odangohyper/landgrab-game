import Phaser from 'phaser';
import { GameState, PlayerState, CardTemplate, ResolvedAction } from '../../types';

export class MainGameScene extends Phaser.Scene {
  private playedCardPlayer?: Phaser.GameObjects.Container;
  private playedCardOpponent?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  init() {
    console.log('MainGameScene init() called');
    // The 'gameOver' event is emitted from the React component (GameView.tsx)
    this.game.events.on('gameOver', this.displayGameOverMessage, this);
  }

  preload() {
    this.load.image('card_back', 'images/cards/card_back.jpg');
    this.load.image('COLLECT_FUNDS', 'images/cards/GAIN_FUNDS.jpg');

    // Load all card images passed from React via registry
    const cardTemplates: { [templateId: string]: CardTemplate } = this.registry.get('cardTemplates');
    if (cardTemplates) {
      for (const templateId in cardTemplates) {
        if (Object.prototype.hasOwnProperty.call(cardTemplates, templateId)) {
          const template = cardTemplates[templateId];
          if (!this.textures.exists(template.templateId)) {
            this.load.image(template.templateId, template.illustPath);
          }
        }
      }
    }
  }

  create() {
    console.log('MainGameScene create() called');
    this.game.registry.events.on('set', this.handleRegistryChange, this);

    // Check for lastActions immediately in case it was set before this scene's create method ran
    const initialLastActions = this.game.registry.get('lastActions');
    if (initialLastActions) {
      console.log('MainGameScene: Initial lastActions found in registry, displaying actions.');
      this.displayTurnActions(initialLastActions);
    }
  }

  private handleRegistryChange(parent: any, key: string, data: any, previousData: any) {
    console.log(`handleRegistryChange: key: ${key}, data:`, data, `previousData:`, previousData);
    if (key === 'lastActions') {
      if (data && JSON.stringify(data) !== JSON.stringify(previousData)) {
        console.log(`handleRegistryChange: Calling displayTurnActions with data:`, data);
        this.displayTurnActions(data);
      }
    }
  }

  

  

  init() {
    // The 'gameOver' event is emitted from the React component (GameView.tsx)
    this.game.events.on('gameOver', this.displayGameOverMessage, this);
  }

  preload() {
    this.load.image('card_back', 'images/cards/card_back.jpg');
    this.load.image('COLLECT_FUNDS', 'images/cards/GAIN_FUNDS.jpg');

    // Load all card images passed from React via registry
    const cardTemplates: { [templateId: string]: CardTemplate } = this.registry.get('cardTemplates');
    if (cardTemplates) {
      for (const templateId in cardTemplates) {
        if (Object.prototype.hasOwnProperty.call(cardTemplates, templateId)) {
          const template = cardTemplates[templateId];
          if (!this.textures.exists(template.templateId)) {
            this.load.image(template.templateId, template.illustPath);
          }
        }
      }
    }
  }

  create() {
    this.game.registry.events.on('set', this.handleRegistryChange, this);

    // Check for lastActions immediately in case it was set before this scene's create method ran
    const initialLastActions = this.game.registry.get('lastActions');
    if (initialLastActions) {
      this.displayTurnActions(initialLastActions);
    }
  }

  private handleRegistryChange(parent: any, key: string, data: any, previousData: any) {
    if (key === 'lastActions') {
      if (data && JSON.stringify(data) !== JSON.stringify(previousData)) {
        this.displayTurnActions(data);
      }
    }
  }

  

  

  public async displayTurnActions(actions: ResolvedAction[] | null) {
    const currentActions = actions;

    const clientId: string | undefined = this.registry.get('clientId');
    if (!clientId) {
      return;
    }

    if (!currentActions || currentActions.length === 0) {
      return;
    }

    if (this.playedCardPlayer) this.playedCardPlayer.destroy();
    if (this.playedCardOpponent) this.playedCardOpponent.destroy();
    this.playedCardPlayer = undefined;
    this.playedCardOpponent = undefined;

    const playerAction = currentActions.find(a => a.playerId === clientId);
    const opponentAction = currentActions.find(a => a.playerId !== clientId);

    const animationPromises: Promise<void>[] = [];

    if (playerAction) {
      const playerCardPromise = this.displayPlayedCard(playerAction.cardTemplateId, 'player').then(card => {
        this.playedCardPlayer = card;
      });
      animationPromises.push(playerCardPromise);
    }
    if (opponentAction) {
      const opponentCardPromise = this.displayPlayedCard(opponentAction.cardTemplateId, 'opponent').then(card => {
        this.playedCardOpponent = card;
      });
      animationPromises.push(opponentCardPromise);
    }

    await Promise.all(animationPromises);

    // すべてのアニメーションが終わった後、少し待ってからイベントを発行
    this.time.delayedCall(500, () => {
      this.game.events.emit('animationComplete', 'flip');
    });
  }

  private displayGameOverMessage(message: string, isWin: boolean) {
    const { width, height } = this.scale;
    const color = isWin ? '#00ff00' : '#ff0000';

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setAlpha(0);
    overlay.setDepth(100);

    const gameOverText = this.add.text(width / 2, height / 2 - 50, message, {
      fontSize: '52px', // Reduced font size
      color: color,
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    gameOverText.setDepth(101);

    // --- ここからボタン追加ロジック ---
    const buttonsContainer = this.add.dom(width / 2, height / 2 + 70).createFromHTML(`
      <div class="game-over-buttons">
        <button id="title-screen-button" class="game-over-button">タイトル画面に戻る</button>
        <button id="share-twitter-button" class="game-over-button">X(Twitter)で共有する</button>
      </div>
    `).setAlpha(0);
    buttonsContainer.setDepth(102);

    // ボタンのクリックイベントリスナー
    buttonsContainer.addListener('click');
    buttonsContainer.on('click', (event: MouseEvent) => {
      if (event.target instanceof HTMLButtonElement) {
        if (event.target.id === 'title-screen-button') {
          // TODO: タイトル画面への遷移ロジック
        } else if (event.target.id === 'share-twitter-button') {
          // TODO: X(Twitter)共有ロジック
        }
      }
    });
    // --- ここまでボタン追加ロジック ---

    this.tweens.add({
        targets: [overlay, gameOverText, buttonsContainer],
        alpha: { from: 0, to: 1 },
        duration: 500,
        onComplete: () => {
            this.game.events.emit('animationComplete', 'gameOver');
        }
    });
  }

  private displayPlayedCard(templateId: string, playerType: 'player' | 'opponent'): Promise<Phaser.GameObjects.Container> {
    return new Promise(resolve => {
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
      const cardImage = this.add.image(0, 0, 'card_back')
        .setDisplaySize(cardWidth, cardHeight);
      cardContainer.add(cardImage);

      // Animate the container for the flip effect
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
              // After scaling to 0 (invisible), set the actual card texture
              cardImage.setTexture(templateId);
              // Then scale back to 1 to reveal the card
              this.tweens.add({
                targets: cardContainer,
                scaleX: 1,
                duration: 200,
                ease: 'Linear',
                onComplete: () => {
                  // コンテナをシーンの前面に表示
                  cardContainer.setDepth(1);
                  resolve(cardContainer); // アニメーション完了時にPromiseを解決
                }
              });
            }
          });
        }
      });
    });
  }

  update() {
    // Game logic that runs every frame (if needed)
  }

  private displayGameOverMessage(message: string, isWin: boolean) {
    console.log('Displaying Game Over message:', message);
    const { width, height } = this.scale;
    const color = isWin ? '#00ff00' : '#ff0000';

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setAlpha(0);
    overlay.setDepth(100);

    const gameOverText = this.add.text(width / 2, height / 2 - 50, message, {
      fontSize: '52px', // Reduced font size
      color: color,
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    gameOverText.setDepth(101);

    // --- ここからボタン追加ロジック ---
    const buttonsContainer = this.add.dom(width / 2, height / 2 + 70).createFromHTML(`
      <div class="game-over-buttons">
        <button id="title-screen-button" class="game-over-button">タイトル画面に戻る</button>
        <button id="share-twitter-button" class="game-over-button">X(Twitter)で共有する</button>
      </div>
    `).setAlpha(0);
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

    this.tweens.add({
        targets: [overlay, gameOverText, buttonsContainer],
        alpha: { from: 0, to: 1 },
        duration: 500,
        onComplete: () => {
            this.game.events.emit('animationComplete', 'gameOver');
        }
    });
  }

  private displayPlayedCard(templateId: string, playerType: 'player' | 'opponent'): Promise<Phaser.GameObjects.Container> {
    return new Promise(resolve => {
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
      const cardImage = this.add.image(0, 0, 'card_back')
        .setDisplaySize(cardWidth, cardHeight);
      cardContainer.add(cardImage);

      // Animate the container for the flip effect
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
              // After scaling to 0 (invisible), set the actual card texture
              console.log(`displayPlayedCard: Setting texture to ${templateId}. Texture exists: ${this.textures.exists(templateId)}`);
              cardImage.setTexture(templateId);
              // Then scale back to 1 to reveal the card
              this.tweens.add({
                targets: cardContainer,
                scaleX: 1,
                duration: 200,
                ease: 'Linear',
                onComplete: () => {
                  // コンテナをシーンの前面に表示
                  cardContainer.setDepth(1);
                  console.log(`displayPlayedCard: Promise resolved for ${templateId}.`);
                  resolve(cardContainer); // アニメーション完了時にPromiseを解決
                }
              });
            }
          });
        }
      });
    });
  }

  update() {
    // Game logic that runs every frame (if needed)
  }
}