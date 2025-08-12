// packages/web-game-client/src/game/engine.ts

import { GameState, PlayerState, Action, Card, CardTemplate } from '../types';
import { applyGainFunds } from './cards/gain_funds';
import { applyAcquire } from './cards/acquire';
import { applyDefend } from './cards/defend';
import { applyFraud } from './cards/fraud';

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

  // --- Public Methods ---
  public applyAction(player1Action: Action | null, player2Action: Action | null): GameState {
    console.log(`Player 1 Action: ${player1Action ? player1Action.cardId : 'None'}`);
    console.log(`Player 2 Action: ${player2Action ? player2Action.cardId : 'None'}`);

    this.resolveActions(player1Action, player2Action);
    this.checkWinCondition();

    return this.getState();
  }

  public advanceTurn(): GameState {
    this.state.turn++;
    console.log(`--- Turn ${this.state.turn} ---`);

    // 1. 資金獲得フェイズ
    this.state.players.forEach(player => {
      player.funds += 1;
      console.log(`Player ${player.playerId} gained 1 fund. Total funds: ${player.funds}`);
    });

    // 2. ドローフェイズ
    this.state.players.forEach(player => {
      const cardsToDraw = 3 - player.hand.length;
      if (cardsToDraw > 0) {
        this.drawCards(player, cardsToDraw);
        console.log(`Player ${player.playerId} drew ${cardsToDraw} cards. Hand size: ${player.hand.length}`);
      }
    });

    // 3. アクションフェイズの準備
    this.state.phase = 'ACTION';
    console.log(`Phase: ${this.state.phase}`);

    return this.getState();
  }

  public getCardTemplate(templateId: string): CardTemplate | undefined {
    return CARD_TEMPLATES[templateId];
  }

  public static createInitialState(player1Id: string, player2Id: string): GameState {
    const initialDeck: Card[] = [
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

  // --- Private Helper Methods ---
  private drawCards(player: PlayerState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        player.deck = [...player.discard];
        player.discard = [];
        player.deck.sort(() => Math.random() - 0.5);
        console.log(`Player ${player.playerId} reshuffled deck.`);
      }
      if (player.deck.length > 0) {
        const drawnCard = player.deck.shift();
        if (drawnCard) {
          player.hand.push(drawnCard);
        }
      }
    }
  }

  private applyCardEffect(gameState: GameState, player: PlayerState, card: Card): void {
    const cardTemplate = this.getCardTemplate(card.templateId);
    if (!cardTemplate) {
      console.warn(`Card template not found for ${card.templateId}`);
      return;
    }

    const opponent = this.state.players.find(p => p.playerId !== player.playerId);
    if (!opponent) {
      console.error('Opponent not found.');
      return;
    }

    switch (cardTemplate.type) {
      case 'GAIN_FUNDS':
        applyGainFunds(player);
        break;
      case 'ACQUIRE':
        applyAcquire(player, opponent);
        break;
      case 'DEFEND':
        applyDefend(player); // Defend's actual effect is in resolveActions
        break;
      case 'FRAUD':
        applyFraud(player, opponent); // Fraud's actual effect is in resolveActions
        break;
      default:
        console.warn(`Unknown card type: ${cardTemplate.type}`);
    }
  }

  private resolveActions(player1Action: Action | null, player2Action: Action | null): void {
    console.log('Resolving actions...');

    // Determine actual player IDs from actions, or fall back to known IDs if actions are null
    const p1Id = player1Action?.playerId || this.state.players[0].playerId; // Assuming first player in state is player1
    const p2Id = player2Action?.playerId || this.state.players[1].playerId; // Assuming second player in state is player2

    const player1 = this.state.players.find(p => p.playerId === p1Id);
    const player2 = this.state.players.find(p => p.playerId === p2Id);

    if (!player1 || !player2) {
      console.error('Players not found in state.');
      return;
    }

    let p1PlayedCard: Card | undefined;
    let p1CardTemplate: CardTemplate | undefined;
    let p2PlayedCard: Card | undefined;
    let p2CardTemplate: CardTemplate | undefined;

    // --- Process Player 1's action ---
    if (player1Action) {
      const card = player1.hand.find(c => c.id === player1Action.cardId);
      const template = card ? this.getCardTemplate(card.templateId) : undefined;

      if (player1 && card && template) {
        if (player1.funds >= template.cost) {
          player1.funds -= template.cost;
          player1.hand = player1.hand.filter(c => c.id !== card.id);
          player1.discard.push(card);
          p1PlayedCard = card;
          p1CardTemplate = template;
          console.log(`Player ${player1.playerId} played ${template.name}. Funds left: ${player1.funds}`);
        } else {
          console.log(`Player ${player1.playerId} cannot play ${template.name}: Insufficient funds. Card returned to hand.`);
          // Card is not played, so it remains in hand.
        }
      }
    }

    // --- Process Player 2's action ---
    if (player2Action) {
      const card = player2.hand.find(c => c.id === player2Action.cardId);
      const template = card ? this.getCardTemplate(card.templateId) : undefined;

      if (player2 && card && template) {
        if (player2.funds >= template.cost) {
          player2.funds -= template.cost;
          player2.hand = player2.hand.filter(c => c.id !== card.id);
          player2.discard.push(card);
          p2PlayedCard = card;
          p2CardTemplate = template;
          console.log(`Player ${player2.playerId} played ${template.name}. Funds left: ${player2.funds}`);
        } else {
          console.log(`Player ${player2.playerId} cannot play ${template.name}: Insufficient funds. Card returned to hand.`);
          // Card is not played, so it remains in hand.
        }
      }
    }

    // --- Conflict Resolution and Effect Application ---
    let p1AcquireEffective = false;
    let p2AcquireEffective = false;

    // Rule: Acquire vs Acquire nullifies both
    if (p1CardTemplate?.type === 'ACQUIRE' && p2CardTemplate?.type === 'ACQUIRE') {
      console.log('Both players played ACQUIRE. Both are nullified.');
      // No acquire effect for either
    } else {
      // Check for Defend/Fraud against Acquire
      if (p1CardTemplate?.type === 'ACQUIRE') {
        if (p2CardTemplate?.type === 'DEFEND') {
          console.log(`Player ${player2.playerId} DEFENDED against Player ${player1.playerId}'s ACQUIRE.`);
          // Player 1's Acquire is nullified
        } else if (p2CardTemplate?.type === 'FRAUD') {
          console.log(`Player ${player2.playerId} FRAUDED against Player ${player1.playerId}'s ACQUIRE.`);
          // Player 1's Acquire is nullified, Player 2's Fraud applies
          this.applyCardEffect(this.state, player2, p2PlayedCard!); // Fraud effect
        } else {
          p1AcquireEffective = true; // Player 1's Acquire is effective
        }
      }

      if (p2CardTemplate?.type === 'ACQUIRE') {
        if (p1CardTemplate?.type === 'DEFEND') {
          console.log(`Player ${player1.playerId} DEFENDED against Player ${player2.playerId}'s ACQUIRE.`);
          // Player 2's Acquire is nullified
        } else if (p1CardTemplate?.type === 'FRAUD') {
          console.log(`Player ${player1.playerId} FRAUDED against Player ${player2.playerId}'s ACQUIRE.`);
          // Player 2's Acquire is nullified, Player 1's Fraud applies
          this.applyCardEffect(this.state, player1, p1PlayedCard!); // Fraud effect
        } else {
          p2AcquireEffective = true; // Player 2's Acquire is effective
        }
      }
    }

    // Apply effective Acquire cards
    if (p1AcquireEffective) {
      this.applyCardEffect(this.state, player1, p1PlayedCard!); // Acquire effect
    }
    if (p2AcquireEffective) {
      this.applyCardEffect(this.state, player2, p2PlayedCard!); // Acquire effect
    }

    // Apply other card effects (GAIN_FUNDS)
    if (p1CardTemplate?.type === 'GAIN_FUNDS') {
      this.applyCardEffect(this.state, player1, p1PlayedCard!); // Gain Funds effect
    }
    if (p2CardTemplate?.type === 'GAIN_FUNDS') {
      this.applyCardEffect(this.state, player2, p2PlayedCard!); // Gain Funds effect
    }
  }

  private checkWinCondition(): void {
    // Check if any player has 0 properties
    const winner = this.state.players.find(player => player.properties > 0 && player.playerId !== 'player1-id'); // Assuming player1 is human, player2 is NPC
    const loser = this.state.players.find(player => player.properties <= 0);

    if (loser) {
      console.log(`Player ${loser.playerId} has lost all properties!`);
      if (winner) {
        console.log(`Player ${winner.playerId} wins the game!`);
      } else {
        console.log('Game Over. No winner (e.g., both lost simultaneously).');
      }
      // TODO: Implement actual game over state (e.g., set a game over flag in GameState)
      // For now, we'll just log and stop further actions.
      this.state.phase = 'GAME_OVER'; // Add a GAME_OVER phase
    }
  }
}
