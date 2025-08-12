// packages/web-game-client/src/game/engine.ts

import { GameState, PlayerState, Action, Card, CardTemplate, ResolvedAction } from '../types';
import { applyGainFunds } from './cards/gain_funds';
import { applyAcquire } from './cards/acquire';
import { applyDefend } from './cards/defend';
import { applyFraud } from './cards/fraud';

export class GameEngine {
  private state: GameState;
  private cardTemplates: { [key: string]: CardTemplate };

  constructor(initialState: GameState, cardTemplates: { [key: string]: CardTemplate }) {
    // State hydration: Ensure arrays exist, as Firebase might not store empty arrays.
    initialState.players.forEach(player => {
      if (!player.hand) player.hand = [];
      if (!player.deck) player.deck = [];
      if (!player.discard) player.discard = [];
    });
    if (!initialState.lastActions) initialState.lastActions = [];

    this.state = initialState;
    this.cardTemplates = cardTemplates;
  }

  public getState(): GameState {
    return JSON.parse(JSON.stringify(this.state)); // Deep copy
  }

  public applyAction(player1Action: Action | null, player2Action: Action | null): GameState {
    if (this.state.phase === 'GAME_OVER') return this.getState(); // Guard clause

    const resolvedActions = this.resolveActions(player1Action, player2Action);
    this.state.lastActions = resolvedActions; // Store resolved actions
    this.checkWinCondition();
    return this.getState();
  }

  public advanceTurn(): GameState {
    if (this.state.phase === 'GAME_OVER') return this.getState(); // Guard clause

    this.state.turn++;
    this.state.phase = 'DRAW';
    this.state.lastActions = []; // Clear last actions at the start of a new turn

    this.state.players.forEach(player => {
      player.funds += 1;
      const cardsToDraw = 3 - player.hand.length;
      if (cardsToDraw > 0) {
        this.drawCards(player, cardsToDraw);
      }
    });

    this.state.phase = 'ACTION';
    return this.getState();
  }

  public getCardTemplate(templateId: string): CardTemplate | undefined {
    return this.cardTemplates[templateId];
  }

  public static createInitialState(player1Id: string, player2Id: string, cardTemplates: { [key: string]: CardTemplate }): GameState {
    const initialDeck: Card[] = Object.values(cardTemplates)
      .flatMap(t => Array(t.name === '資金集め' ? 4 : 2).fill(t.templateId)) // Example distribution
      .map((templateId, i) => ({ id: `card${i}_${templateId}`, templateId }));
    
    const createPlayer = (id: string): PlayerState => ({
      playerId: id,
      funds: 2,
      properties: 1,
      hand: [],
      deck: [...initialDeck].sort(() => Math.random() - 0.5),
      discard: [],
    });

    return {
      matchId: `match-${Date.now()}`,
      turn: 0,
      players: [createPlayer(player1Id), createPlayer(player2Id)],
      phase: 'DRAW',
      lastActions: [],
    };
  }

  private drawCards(player: PlayerState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) break; // No cards left to draw
        player.deck = [...player.discard].sort(() => Math.random() - 0.5);
        player.discard = [];
      }
      const drawnCard = player.deck.shift();
      if (drawnCard) {
        player.hand.push(drawnCard);
      }
    }
  }

  private applyCardEffect(player: PlayerState, card: Card, opponent: PlayerState): void {
    const cardTemplate = this.getCardTemplate(card.templateId);
    if (!cardTemplate) return;

    switch (cardTemplate.type) {
      case 'GAIN_FUNDS': applyGainFunds(player); break;
      case 'ACQUIRE': applyAcquire(player, opponent); break;
      case 'DEFEND': applyDefend(player); break;
      case 'FRAUD': applyFraud(player, opponent); break;
    }
  }

  private resolveActions(player1Action: Action | null, player2Action: Action | null): ResolvedAction[] {
    this.state.phase = 'RESOLUTION';
    const resolved: ResolvedAction[] = [];

    const player1 = this.state.players.find(p => p.playerId === player1Action?.playerId);
    const player2 = this.state.players.find(p => p.playerId === player2Action?.playerId);

    if (!player1 || !player2) return [];

    const getCardInfo = (player: PlayerState, action: Action | null) => {
      if (!action) return { card: undefined, template: undefined };
      const card = player.hand.find(c => c.id === action.cardId);
      const template = card ? this.getCardTemplate(card.templateId) : undefined;
      return { card, template };
    };

    const { card: p1Card, template: p1Template } = getCardInfo(player1, player1Action);
    const { card: p2Card, template: p2Template } = getCardInfo(player2, player2Action);

    const processPlay = (player: PlayerState, card: Card, template: CardTemplate) => {
      if (player.funds >= template.cost) {
        player.funds -= template.cost;
        player.hand = player.hand.filter(c => c.id !== card.id);
        player.discard.push(card);
        resolved.push({ playerId: player.playerId, cardTemplateId: template.templateId });
        return true;
      }
      return false;
    };

    const p1Played = p1Card && p1Template ? processPlay(player1, p1Card, p1Template) : false;
    const p2Played = p2Card && p2Template ? processPlay(player2, p2Card, p2Template) : false;

    const p1EffectiveTemplate = p1Played ? p1Template : undefined;
    const p2EffectiveTemplate = p2Played ? p2Template : undefined;

    // --- Conflict Resolution ---
    const isP1Acquire = p1EffectiveTemplate?.type === 'ACQUIRE';
    const isP2Acquire = p2EffectiveTemplate?.type === 'ACQUIRE';
    const isP1Defend = p1EffectiveTemplate?.type === 'DEFEND';
    const isP2Defend = p2EffectiveTemplate?.type === 'DEFEND';
    const isP1Fraud = p1EffectiveTemplate?.type === 'FRAUD';
    const isP2Fraud = p2EffectiveTemplate?.type === 'FRAUD';

    let p1Effect = true;
    let p2Effect = true;

    if (isP1Acquire && isP2Acquire) {
      p1Effect = false; p2Effect = false;
    } else if (isP1Acquire && isP2Defend) {
      p1Effect = false;
    } else if (isP1Acquire && isP2Fraud) {
      p1Effect = false;
      this.applyCardEffect(player2, p2Card!, player1); // P2 Fraud effect
    } else if (isP2Acquire && isP1Defend) {
      p2Effect = false;
    } else if (isP2Acquire && isP1Fraud) {
      p2Effect = false;
      this.applyCardEffect(player1, p1Card!, player2); // P1 Fraud effect
    }

    // Apply non-countered, non-fraud effects
    if (p1Effect && p1Card && p1EffectiveTemplate && p1EffectiveTemplate.type !== 'FRAUD' && p1EffectiveTemplate.type !== 'DEFEND') {
      this.applyCardEffect(player1, p1Card, player2);
    }
    if (p2Effect && p2Card && p2EffectiveTemplate && p2EffectiveTemplate.type !== 'FRAUD' && p2EffectiveTemplate.type !== 'DEFEND') {
      this.applyCardEffect(player2, p2Card, player1);
    }
    
    return resolved;
  }

  private checkWinCondition(): void {
    const p1Lost = this.state.players[0].properties <= 0;
    const p2Lost = this.state.players[1].properties <= 0;

    if (p1Lost || p2Lost) {
      this.state.phase = 'GAME_OVER';
      console.log('Game Over');
    }
  }
}
