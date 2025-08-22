import Phaser from 'phaser';
import { CardTemplate, ResolvedAction, Action } from '../../types';

export class MainGameScene extends Phaser.Scene {
  private playedCardPlayer?: Phaser.GameObjects.Container;
  private playedCardOpponent?: Phaser.GameObjects.Container;
  private selectedPlayerCard?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  init() {
    console.log('MainGameScene init() called');
    this.game.events.on('gameOver', this.displayGameOverMessage, this);
  }

  preload() {
    console.log('MainGameScene preload() called');
    this.load.image('card_back', 'images/cards/card_back.jpg');
    this.load.image('COLLECT_FUNDS', 'images/cards/GAIN_FUNDS.jpg');

    const cardTemplates: { [templateId: string]: CardTemplate } = this.registry.get('cardTemplates');
    if (cardTemplates) {
      for (const templateId in cardTemplates) {
        if (Object.prototype.hasOwnProperty.call(cardTemplates, templateId)) {
          const template = cardTemplates[templateId];
          if (!this.textures.exists(template.templateId)) {
            console.log(`Preloading image for ${template.templateId} from ${template.illustPath}`);
            this.load.image(template.templateId, template.illustPath);
          }
        }
      }
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#282c34');
    console.log('MainGameScene create() called');
    this.game.registry.events.on('set', this.handleRegistryChange, this);

    const initialLastActions = this.game.registry.get('lastActions');
    if (initialLastActions) {
      console.log('MainGameScene: Initial lastActions found in registry, displaying actions.');
      this.displayTurnActions(initialLastActions);
    }
  }

  shutdown() {
    console.log('MainGameScene shutdown() called');
    this.game.events.off('gameOver', this.displayGameOverMessage, this);
    this.game.registry.events.off('set', this.handleRegistryChange, this);
  }

  private handleRegistryChange(parent: any, key: string, data: any, previousData: any) {
    console.log(`Registry change detected. Key: '${key}'.`);
    if (key === 'lastActions') {
      if (data && JSON.stringify(data) !== JSON.stringify(previousData)) {
        console.log(`'lastActions' changed, calling displayTurnActions with data:`, data);
        this.displayTurnActions(data);
      }
    }
  }

  public displaySelectedCardBack(isVisible: boolean) {
    if (isVisible) {
      if (!this.selectedPlayerCard) {
        const { width, height } = this.scale;
        const cardWidth = 200;
        const cardHeight = 400;
        const borderWidth = 6;
        const borderColor = 0x00ff00; // 蛍光色の緑

        this.selectedPlayerCard = this.add.container(width / 2 + 120, height / 2);

        const border = this.add.graphics();
        border.lineStyle(borderWidth, borderColor, 1);
        border.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
        this.selectedPlayerCard.add(border);

        const cardImage = this.add.image(0, 0, 'card_back')
          .setDisplaySize(cardWidth, cardHeight);
        this.selectedPlayerCard.add(cardImage);

        this.selectedPlayerCard.setDepth(0);
      }
      this.selectedPlayerCard.setVisible(true);
    } else {
      if (this.selectedPlayerCard) {
        this.selectedPlayerCard.setVisible(false);
      }
    }
  }

  public async animateAndResolveTurn(playerAction: Action, opponentAction: Action): Promise<void> {
    // Here you can add animations for both cards flipping simultaneously
    // For simplicity, we'll just wait a bit before resolving.
    return new Promise(resolve => {
      this.time.delayedCall(500, () => {
        resolve();
      });
    });
  }

  public async displayTurnActions(actions: ResolvedAction[] | null) {
    console.log('displayTurnActions called with:', actions);
    const clientId: string | undefined = this.registry.get('clientId');
    if (!clientId) {
      console.error('displayTurnActions: clientId not found in registry.');
      return;
    }

    if (!actions || actions.length === 0) {
      console.warn('displayTurnActions: actions are null or empty. Emitting animationComplete to unblock game flow.');
      this.time.delayedCall(100, () => {
        this.game.events.emit('animationComplete', 'no-actions');
      });
      return;
    }

    if (this.playedCardPlayer) this.playedCardPlayer.destroy();
    if (this.playedCardOpponent) this.playedCardOpponent.destroy();
    this.playedCardPlayer = undefined;
    this.playedCardOpponent = undefined;

    const playerAction = actions.find(a => a.playerId === clientId);
    const opponentAction = actions.find(a => a.playerId !== clientId);

    const animationPromises: Promise<void>[] = [];

    if (playerAction) {
      console.log(`Queueing player card animation for ${playerAction.cardTemplateId}.`);
      const playerCardPromise = this.displayPlayedCard(playerAction.cardTemplateId, 'player', this.selectedPlayerCard).then(card => {
        this.playedCardPlayer = card;
        this.selectedPlayerCard = undefined; // 再利用したのでクリア
      });
      animationPromises.push(playerCardPromise);
    }
    if (opponentAction) {
      console.log(`Queueing opponent card animation for ${opponentAction.cardTemplateId}.`);
      const opponentCardPromise = this.displayPlayedCard(opponentAction.cardTemplateId, 'opponent').then(card => {
        this.playedCardOpponent = card;
      });
      animationPromises.push(opponentCardPromise);
    }

    console.log('Waiting for card animations to complete...');
    await Promise.all(animationPromises);
    console.log('All card animations complete.');

    this.time.delayedCall(500, () => {
      console.log("Emitting 'animationComplete' event from MainGameScene.");
      this.game.events.emit('animationComplete', 'flip');
    });
  }

  private displayGameOverMessage(message: string, isWin: boolean) {
    console.log('Displaying Game Over message:', message);
    const { width, height } = this.scale;
    const color = isWin ? '#00ff00' : '#ff0000';

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setAlpha(0);
    overlay.setDepth(100);

    const gameOverText = this.add.text(width / 2, height / 2 - 50, message, {
      fontSize: '52px',
      color: color,
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    gameOverText.setDepth(101);

    const buttonsContainer = this.add.dom(width / 2, height / 2 + 70).createFromHTML(`
      <div class="game-over-buttons">
        <button id="title-screen-button" class="game-over-button">タイトル画面に戻る</button>
        <button id="share-twitter-button" class="game-over-button">X(Twitter)で共有する</button>
      </div>
    `).setAlpha(0);
    buttonsContainer.setDepth(102);

    buttonsContainer.addListener('click');
    buttonsContainer.on('click', (event: MouseEvent) => {
      if (event.target instanceof HTMLButtonElement) {
        if (event.target.id === 'title-screen-button') {
          console.log('タイトル画面に戻るボタンがクリックされました');
          window.location.reload();
        } else if (event.target.id === 'share-twitter-button') {
          console.log('X(Twitter)で共有するボタンがクリックされました');
          // TODO: X(Twitter)共有ロジック
        }
      }
    });

    this.tweens.add({
        targets: [overlay, gameOverText, buttonsContainer],
        alpha: { from: 0, to: 1 },
        duration: 500,
        onComplete: () => {
            this.game.events.emit('animationComplete', 'gameOver');
        }
    });
  }

  private displayPlayedCard(templateId: string, playerType: 'player' | 'opponent', existingCardContainer?: Phaser.GameObjects.Container): Promise<Phaser.GameObjects.Container> {
    return new Promise(resolve => {
      console.log(`Displaying card ${templateId} for ${playerType}`);
      const { width, height } = this.scale;

      const targetX = playerType === 'player' ? width / 2 + 120 : width / 2 - 120;
      const targetY = height / 2;
      
      const cardWidth = 200;
      const cardHeight = 400;
      const borderWidth = 6;
      const borderColor = playerType === 'player' ? 0x00ff00 : 0xff0000;

      let cardContainer: Phaser.GameObjects.Container;
      let cardImage: Phaser.GameObjects.Image;
      let border: Phaser.GameObjects.Graphics;

      if (existingCardContainer) {
        cardContainer = existingCardContainer;
        // 既存のコンテナ内の画像と縁取りを更新
        cardImage = cardContainer.getAt(1) as Phaser.GameObjects.Image; // 画像は2番目の子要素
        border = cardContainer.getAt(0) as Phaser.GameObjects.Graphics; // 縁取りは1番目の子要素
        cardContainer.setAlpha(1); // 既に表示されているのでalphaは1
        cardContainer.setScale(1); // スケールをリセット
        cardContainer.setX(targetX);
        cardContainer.setY(targetY);
        border.lineStyle(borderWidth, borderColor, 1);
        border.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
      } else {
        cardContainer = this.add.container(targetX, targetY);
        cardContainer.setAlpha(0); // 新規作成なのでalphaは0

        border = this.add.graphics();
        border.lineStyle(borderWidth, borderColor, 1);
        border.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
        cardContainer.add(border);

        cardImage = this.add.image(0, 0, 'card_back')
          .setDisplaySize(cardWidth, cardHeight);
        cardContainer.add(cardImage);
      }

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
              console.log(`displayPlayedCard: Setting texture to ${templateId}. Texture exists: ${this.textures.exists(templateId)}`);
              cardImage.setTexture(templateId);
              this.tweens.add({
                targets: cardContainer,
                scaleX: 1,
                duration: 200,
                ease: 'Linear',
                onComplete: () => {
                  cardContainer.setDepth(1);
                  console.log(`displayPlayedCard: Promise resolved for ${templateId}.`);
                  resolve(cardContainer);
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
