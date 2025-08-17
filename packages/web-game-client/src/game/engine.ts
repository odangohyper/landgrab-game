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
      // 手札をすべて捨て札に移動
      player.discard.push(...player.hand);
      player.hand = [];

      // 新たに3枚のカードを引く
      this.drawCards(player, 3);
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

  public static createInitialState(player1Id: string, player2Id: string, cardTemplates: { [key: string]: CardTemplate }, player1Deck: Deck, player2Deck: Deck): GameState {
    const createPlayer = (id: string, deck: Deck): PlayerState => {
      const cardsInDeck: Card[] = [];
      for (const cardId in deck.cards) {
        for (let i = 0; i < deck.cards[cardId]; i++) {
          cardsInDeck.push({ id: `${cardId}-${Math.random()}-${Date.now()}`, templateId: cardId }); // Unique ID for each card instance
        }
      }
      return {
        playerId: id,
        funds: 0,
        properties: 1,
        hand: [],
        deck: cardsInDeck.sort(() => Math.random() - 0.5), // Shuffle the created deck
        discard: [],
      };
    };

    return {
      matchId: `match-${Date.now()}`,
      turn: 0,
      players: [createPlayer(player1Id, player1Deck), createPlayer(player2Id, player2Deck)],
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
          player.funds += 1;
          resolved.push({ playerId: player.playerId, cardTemplateId: 'COLLECT_FUNDS_COMMAND' });
          const clientId = state.players[0].playerId;
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

    const p1Played = p1Card && p1Template && player1 && player1.funds >= p1Template.cost;
    const p2Played = p2Card && p2Template && player2 && player2.funds >= p2Template.cost;

    if (p1Played) {
      player1.funds -= p1Template!.cost;
      player1.hand = player1.hand.filter(c => c.id !== p1Card!.id);
      player1.discard.push(p1Card!);
      resolved.push({ playerId: player1.playerId, cardTemplateId: p1Template!.templateId });
      state.log.push(`${player1.playerId === state.players[0].playerId ? 'プレイヤー' : '対戦相手'}の行動「${p1Template!.name}」`);
    }
    if (p2Played) {
      player2.funds -= p2Template!.cost;
      player2.hand = player2.hand.filter(c => c.id !== p2Card!.id);
      player2.discard.push(p2Card!);
      resolved.push({ playerId: player2.playerId, cardTemplateId: p2Template!.templateId });
      state.log.push(`${player2.playerId === state.players[0].playerId ? 'プレイヤー' : '対戦相手'}の行動「${p2Template!.name}」`);
    }

    const p1Type = p1Played ? p1Template!.type : undefined;
    const p2Type = p2Played ? p2Template!.type : undefined;

    let p1Effect = !!p1Played;
    let p2Effect = !!p2Played;

    const p1Name = player1?.playerId === state.players[0].playerId ? 'プレイヤー' : '対戦相手';
    const p2Name = player2?.playerId === state.players[0].playerId ? 'プレイヤー' : '対戦相手';

    if (p1Type === 'BRIBE' && p2Type === 'BRIBE') {
      p1Effect = false; p2Effect = false;
      state.log.push('両者の賄賂は互いに打ち消しあった！');
    } else if (p1Type === 'BRIBE') {
      if (p2Type === 'DEFEND' || p2Type === 'FRAUD') p2Effect = false;
    } else if (p2Type === 'BRIBE') {
      if (p1Type === 'DEFEND' || p1Type === 'FRAUD') p1Effect = false;
    } else if (p1Type === 'ACQUIRE' && p2Type === 'ACQUIRE') {
      p1Effect = false; p2Effect = false;
      state.log.push(`${p1Name}の買収は失敗した！`);
      state.log.push(`${p2Name}の買収は失敗した！`);
    } else if (p1Type === 'ACQUIRE' && p2Type === 'DEFEND') {
      p1Effect = false;
      state.log.push(`${p1Name}の買収は防がれた！`);
    } else if (p2Type === 'ACQUIRE' && p1Type === 'DEFEND') {
      p2Effect = false;
      state.log.push(`${p2Name}の買収は防がれた！`);
    } else if (p1Type === 'ACQUIRE' && p2Type === 'FRAUD') {
      p1Effect = false;
    } else if (p2Type === 'ACQUIRE' && p1Type === 'FRAUD') {
      p2Effect = false;
    }

    if (p1Effect && p1Template) {
      const opponent = state.players.find(p => p.playerId !== player1!.playerId)!;
      switch (p1Template.type) {
        case 'ACQUIRE':
          applyAcquire(player1!, opponent);
          state.log.push(`${p1Name}の買収は成功した！`);
          break;
        case 'BRIBE':
          applyAcquire(player1!, opponent);
          state.log.push(`${p1Name}の賄賂は成功した！`);
          break;
        case 'INVEST':
          player1!.funds += 3;
          state.log.push(`${p1Name}は投資で3資金を獲得した！`);
          break;
        case 'FRAUD':
          if (p2Type === 'ACQUIRE') {
            applyFraud(player1!, opponent);
            state.log.push(`${p2Name}の買収は詐欺で返り討ちにあった！`);
          }
          break;
      }
    }

    if (p2Effect && p2Template) {
      const opponent = state.players.find(p => p.playerId !== player2!.playerId)!;
      switch (p2Template.type) {
        case 'ACQUIRE':
          applyAcquire(player2!, opponent);
          state.log.push(`${p2Name}の買収は成功した！`);
          break;
        case 'BRIBE':
          applyAcquire(player2!, opponent);
          state.log.push(`${p2Name}の賄賂は成功した！`);
          break;
        case 'INVEST':
          player2!.funds += 3;
          state.log.push(`${p2Name}は投資で3資金を獲得した！`);
          break;
        case 'FRAUD':
          if (p1Type === 'ACQUIRE') {
            applyFraud(player2!, opponent);
            state.log.push(`${p1Name}の買収は詐欺で返り討ちにあった！`);
          }
          break;
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
