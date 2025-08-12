// packages/web-game-client/src/game/engine.ts

import { GameState, PlayerState, Action, Card, CardTemplate } from '../types';

// 仮のカードテンプレートデータ (実際にはDBから取得)
const CARD_TEMPLATES: { [key: string]: CardTemplate } = {
  GAIN_FUNDS: { templateId: 'GAIN_FUNDS', name: '資金集め', cost: 0, type: 'GAIN_FUNDS' },
  ACQUIRE: { templateId: 'ACQUIRE', name: '買収', cost: 2, type: 'ACQUIRE' },
  DEFEND: { templateId: 'DEFEND', name: '防衛', cost: 0, type: 'DEFEND' },
  FRAUD: { templateId: 'FRAUD', name: '詐欺', cost: 1, type: 'FRAUD' },
};

export class GameEngine {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  public getState(): GameState {
    return JSON.parse(JSON.stringify(this.state)); // Deep copy to prevent external modification
  }

  public applyAction(action: Action): GameState {
    // アクションを適用するロジック (未実装)
    console.log(`Applying action: Player ${action.playerId} played card ${action.cardId}`);
    // ここでstateを更新する
    return this.getState();
  }

  public advanceTurn(): GameState {
    // ターンの進行ロジック (未実装)
    // 資金獲得フェイズ、ドローフェイズ、アクションフェイズの準備など
    this.state.turn++;
    console.log(`Advancing to turn ${this.state.turn}`);
    return this.getState();
  }

  // ヘルパー関数 (カードの取得など)
  public getCardTemplate(templateId: string): CardTemplate | undefined {
    return CARD_TEMPLATES[templateId];
  }

  // 初期状態のゲームステートを生成するヘルパー
  public static createInitialState(player1Id: string, player2Id: string): GameState {
    const initialDeck: Card[] = [
      // 仮のデッキ (各カード2枚ずつ)
      { id: 'card1', templateId: 'GAIN_FUNDS' }, { id: 'card2', templateId: 'GAIN_FUNDS' },
      { id: 'card3', templateId: 'ACQUIRE' }, { id: 'card4', templateId: 'ACQUIRE' },
      { id: 'card5', templateId: 'DEFEND' }, { id: 'card6', templateId: 'DEFEND' },
      { id: 'card7', templateId: 'FRAUD' }, { id: 'card8', templateId: 'FRAUD' },
      { id: 'card9', templateId: 'GAIN_FUNDS' }, { id: 'card10', templateId: 'ACQUIRE' },
    ];

    const player1: PlayerState = {
      playerId: player1Id,
      funds: 2,
      properties: 1,
      hand: [],
      deck: [...initialDeck].sort(() => Math.random() - 0.5), // シャッフル
      discard: [],
    };

    const player2: PlayerState = {
      playerId: player2Id,
      funds: 2,
      properties: 1,
      hand: [],
      deck: [...initialDeck].sort(() => Math.random() - 0.5), // シャッフル
      discard: [],
    };

    return {
      matchId: `match-${Date.now()}`,
      turn: 0,
      players: [player1, player2],
      phase: 'DRAW', // 初期フェイズ
    };
  }
}
