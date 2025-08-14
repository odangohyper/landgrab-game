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

    // Create a deep copy of the state to work with, ensuring immutability.
    const newState = this.getState();

    const resolvedActions = this.resolveActions(newState, player1Action, player2Action);
    newState.lastActions = resolvedActions; // Store resolved actions
    
    this.checkWinCondition(newState);

    this.state = newState; // Update the engine's state to the new state.
    return this.getState();
  }

  public advanceTurn(): GameState {
    if (this.state.phase === 'GAME_OVER') return this.getState(); // Guard clause

    this.state.turn++;
    this.state.phase = 'DRAW';
    this.state.lastActions = []; // Clear last actions at the start of a new turn
    this.state.log.push(`--- ターン ${this.state.turn} ---`);

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
      log: ['ゲーム開始！'],
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

  private applyCardEffect(state: GameState, player: PlayerState, card: Card, opponent: PlayerState): void {
    const cardTemplate = this.getCardTemplate(card.templateId);
    if (!cardTemplate) return;

    let logMessage: string = '';

    switch (cardTemplate.type) {
      case 'GAIN_FUNDS': logMessage = applyGainFunds(player); break;
      case 'ACQUIRE': logMessage = applyAcquire(player, opponent); break;
      case 'DEFEND': logMessage = applyDefend(player); break;
      case 'FRAUD': logMessage = applyFraud(player, opponent); break;
    }

    if (logMessage) {
      state.log.push(logMessage);
    }
  }

  private resolveActions(state: GameState, player1Action: Action | null, player2Action: Action | null): ResolvedAction[] {
    state.phase = 'RESOLUTION';
    const resolved: ResolvedAction[] = [];

    const player1 = state.players.find(p => p.playerId === player1Action?.playerId);
    const player2 = state.players.find(p => p.playerId === player2Action?.playerId);

    if (!player1 || !player2) return [];

    const getCardInfo = (player: PlayerState, action: Action | null) => {
        if (!action) return { card: undefined, template: undefined };
        const card = player.hand.find(c => c.id === action.cardId);
        const template = card ? this.getCardTemplate(card.templateId) : undefined;
        return { card, template };
    };

    const { card: p1Card, template: p1Template } = getCardInfo(player1, player1Action);
    const { card: p2Card, template: p2Template } = getCardInfo(player2, player2Action);

    // Step 1: Determine what was played, pay costs, and record the play.
    const p1Played = p1Card && p1Template && player1.funds >= p1Template.cost;
    const p2Played = p2Card && p2Template && player2.funds >= p2Template.cost;

    if (p1Played) {
        player1.funds -= p1Template!.cost;
        player1.hand = player1.hand.filter(c => c.id !== p1Card!.id);
        player1.discard.push(p1Card!);
        resolved.push({ playerId: player1.playerId, cardTemplateId: p1Template!.templateId });
    }
    if (p2Played) {
        player2.funds -= p2Template!.cost;
        player2.hand = player2.hand.filter(c => c.id !== p2Card!.id);
        player2.discard.push(p2Card!);
        resolved.push({ playerId: player2.playerId, cardTemplateId: p2Template!.templateId });
    }

    // Step 2: Resolve conflicts and apply effects based on played cards.
    const p1EffectiveTemplate = p1Played ? p1Template : undefined;
    const p2EffectiveTemplate = p2Played ? p2Template : undefined;

    const isP1Acquire = p1EffectiveTemplate?.type === 'ACQUIRE';
    const isP2Acquire = p2EffectiveTemplate?.type === 'ACQUIRE';
    const isP1Defend = p1EffectiveTemplate?.type === 'DEFEND';
    const isP2Defend = p2EffectiveTemplate?.type === 'DEFEND';
    const isP1Fraud = p1EffectiveTemplate?.type === 'FRAUD';
    const isP2Fraud = p2EffectiveTemplate?.type === 'FRAUD';

    let p1Effect = p1Played; // An effect can only happen if the card was played.
    let p2Effect = p2Played;

    if (isP1Acquire && isP2Acquire) {
        p1Effect = false; p2Effect = false;
    } else if (isP1Acquire && isP2Defend) {
        p1Effect = false;
    } else if (isP1Acquire && isP2Fraud) {
        p1Effect = false;
        this.applyCardEffect(state, player2, p2Card!, player1); // P2 Fraud effect applies
    } else if (isP2Acquire && isP1Defend) {
        p2Effect = false;
    } else if (isP2Acquire && isP1Fraud) {
        p2Effect = false;
        this.applyCardEffect(state, player1, p1Card!, player2); // P1 Fraud effect applies
    }

    // Apply standard, non-countered, non-fraud effects
    if (p1Effect && p1EffectiveTemplate && p1EffectiveTemplate.type !== 'FRAUD' && p1EffectiveTemplate.type !== 'DEFEND') {
        this.applyCardEffect(state, player1, p1Card!, player2);
    }
    if (p2Effect && p2EffectiveTemplate && p2EffectiveTemplate.type !== 'FRAUD' && p2EffectiveTemplate.type !== 'DEFEND') {
        this.applyCardEffect(state, player2, p2Card!, player1);
    }
    
    return resolved;
  }

  private checkWinCondition(state: GameState): void {
    const p1Lost = state.players[0].properties <= 0;
    const p2Lost = state.players[1].properties <= 0;

    if (p1Lost || p2Lost) {
      state.phase = 'GAME_OVER';
      console.log('ゲーム終了');
    }
  }
}
