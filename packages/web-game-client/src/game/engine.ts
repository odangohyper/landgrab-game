// packages/web-game-client/src/game/engine.ts

import { GameState, PlayerState, Action, Card, CardTemplate, ResolvedAction } from '../types';
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
    const playerFunds = this.state.players[0].funds;
    const opponentFunds = this.state.players[1].funds;
        this.state.log.push(`ターン${this.state.turn}　プレイヤー資産：${playerFunds} 対戦相手資産：${opponentFunds}`);

    this.state.players.forEach(player => {
      
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

  public getPlayableCards(player: PlayerState): Card[] {
    if (!player) return [];
    return player.hand.filter(card => {
      const template = this.getCardTemplate(card.templateId);
      return template && player.funds >= template.cost;
    });
  }

  public static createInitialState(player1Id: string, player2Id: string, cardTemplates: { [key: string]: CardTemplate }): GameState {
    const initialDeck: Card[] = Object.values(cardTemplates)
      .flatMap(t => Array(3).fill(t.templateId)) // 3 of each of the 3 card types
      .map((templateId, i) => ({ id: `card${i}_${templateId}`, templateId }));
    
    const createPlayer = (id: string): PlayerState => ({
      playerId: id,
      funds: 0,
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

    switch (cardTemplate.type) {
      case 'ACQUIRE': applyAcquire(player, opponent); break;
      case 'DEFEND': applyDefend(player); break;
      case 'FRAUD': applyFraud(player, opponent); break;
    }
  }

  private resolveActions(state: GameState, player1Action: Action | null, player2Action: Action | null): ResolvedAction[] {
    state.phase = 'RESOLUTION';
    const resolved: ResolvedAction[] = [];

    // Handle collect_funds actions first
    [player1Action, player2Action].forEach(action => {
      if (action && action.actionType === 'collect_funds') {
        const player = state.players.find(p => p.playerId === action.playerId);
        if (player) {
          player.funds += 1; // Increase funds by 1
          resolved.push({ playerId: player.playerId, cardTemplateId: 'COLLECT_FUNDS_COMMAND' });
          const clientId = state.players[0].playerId; // Assuming state.players[0] is always client
          state.log.push(`${player.playerId === clientId ? 'プレイヤー' : '対戦相手'}は「資金集め」コマンドを実行した`);
        }
      }
    });

    const player1 = state.players.find(p => p.playerId === player1Action?.playerId);
    const player2 = state.players.find(p => p.playerId === player2Action?.playerId);

    

    const getCardInfo = (player: PlayerState | undefined, action: Action | null) => {
        if (!player || !action || action.actionType === 'collect_funds') return { card: undefined, template: undefined };
        const card = player.hand.find(c => c.id === action.cardId);
        const template = card ? this.getCardTemplate(card.templateId) : undefined;
        return { card, template };
    };

    const { card: p1Card, template: p1Template } = getCardInfo(player1, player1Action);
    const { card: p2Card, template: p2Template } = getCardInfo(player2, player2Action);

    // Step 1: Determine what was played, pay costs, and record the play.
    const p1Played = p1Card && p1Template && player1 && player1.funds >= p1Template.cost;
    const p2Played = p2Card && p2Template && player2 && player2.funds >= p2Template.cost;

    if (p1Played) {
        player1.funds -= p1Template!.cost;
        player1.hand = player1.hand.filter(c => c.id !== p1Card!.id);
        player1.discard.push(p1Card!);
        resolved.push({ playerId: player1.playerId, cardTemplateId: p1Template!.templateId });
        const clientId = state.players[0].playerId; // Assuming state.players[0] is always client
        state.log.push(`${player1!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の行動：「${p1Template!.name}」`);
    }
    if (p2Played) {
        player2.funds -= p2Template!.cost;
        player2.hand = player2.hand.filter(c => c.id !== p2Card!.id);
        player2.discard.push(p2Card!);
        resolved.push({ playerId: player2.playerId, cardTemplateId: p2Template!.templateId });
        const clientId = state.players[0].playerId; // Assuming state.players[0] is always client
        state.log.push(`${player2!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の行動：「${p2Template!.name}」`);
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

    let p1Effect = !!p1Played;
    let p2Effect = !!p2Played;

    const clientId = state.players[0].playerId; // Assuming state.players[0] is always client

    if (isP1Acquire && isP2Acquire) {
        p1Effect = false; p2Effect = false;
        state.log.push(`${player1!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の買収は失敗した！`);
        state.log.push(`${player2!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の買収は失敗した！`);
    } else if (isP1Acquire && isP2Defend) {
        p1Effect = false;
        state.log.push(`${player1!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の買収は失敗した！`);
    } else if (isP1Acquire && isP2Fraud) {
        p1Effect = false;
        const opponentOfP2 = state.players.find(p => p.playerId !== player2!.playerId)!;
        this.applyCardEffect(state, player2!, p2Card!, opponentOfP2); // 詐欺の効果を適用
        state.log.push(`${player1!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の買収は詐欺で返り討ちにあった！`);
    } else if (isP2Acquire && isP1Defend) {
        p2Effect = false;
        state.log.push(`${player2!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の買収は失敗した！`);
    } else if (isP2Acquire && isP1Fraud) {
        p2Effect = false;
        const opponentOfP1 = state.players.find(p => p.playerId !== player1!.playerId)!;
        this.applyCardEffect(state, player1!, p1Card!, opponentOfP1); // 詐欺の効果を適用
        state.log.push(`${player2!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の買収は詐欺で返り討ちにあった！`);
    }

    // Apply standard, non-countered, non-fraud effects
    if (p1Effect && p1EffectiveTemplate) {
        if (p1EffectiveTemplate.type === 'ACQUIRE') {
            const opponentOfP1 = state.players.find(p => p.playerId !== player1!.playerId)!;
            this.applyCardEffect(state, player1!, p1Card!, opponentOfP1);
            state.log.push(`${player1!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の買収は成功した！`);
        } else if (p1EffectiveTemplate.type !== 'FRAUD' && p1EffectiveTemplate.type !== 'DEFEND') {
            // Other non-ACQUIRE, non-FRAUD, non-DEFEND cards
            const opponentOfP1 = state.players.find(p => p.playerId !== player1!.playerId)!;
            this.applyCardEffect(state, player1!, p1Card!, opponentOfP1);
        }
    }

    if (p2Effect && p2EffectiveTemplate) {
        if (p2EffectiveTemplate.type === 'ACQUIRE') {
            const opponentOfP2 = state.players.find(p => p.playerId !== player2!.playerId)!;
            this.applyCardEffect(state, player2!, p2Card!, opponentOfP2);
            state.log.push(`${player2!.playerId === clientId ? 'プレイヤー' : '対戦相手'}の買収は成功した！`);
        } else if (p2EffectiveTemplate.type !== 'FRAUD' && p2EffectiveTemplate.type !== 'DEFEND') {
            // Other non-ACQUIRE, non-FRAUD, non-DEFEND cards
            const opponentOfP2 = state.players.find(p => p.playerId !== player2!.playerId)!;
            this.applyCardEffect(state, player2!, p2Card!, opponentOfP2);
        }
    }
    
    return resolved;
  }

  private checkWinCondition(state: GameState): void {
    const p1Lost = state.players[0].properties <= 0;
    const p2Lost = state.players[1].properties <= 0;

    if (p1Lost || p2Lost) {
      state.phase = 'GAME_OVER';
      console.log('ゲーム終了');

      if (p1Lost) {
        state.log.push(`プレイヤーの不動産が0になった！対戦相手の勝利！`);
      } else if (p2Lost) {
        state.log.push(`対戦相手の不動産が0になった！プレイヤーの勝利！`);
      }
    }
  }
}
