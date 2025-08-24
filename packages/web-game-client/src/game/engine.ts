// packages/web-game-client/src/game/engine.ts

import { GameState, PlayerState, Action, Card, CardTemplate, ResolvedAction, EffectAction, Deck } from '../types';
import { acquireProperty } from './effects/acquireProperty';
import { gainFunds } from './effects/gainFunds';

// A helper type for the resolution process
interface EffectContext {
  player: PlayerState;
  opponent: PlayerState;
  card: CardTemplate;
  isCancelled: boolean;
}

export class GameEngine {
  private state: GameState;
  private cardTemplates: { [key: string]: CardTemplate };

  constructor(initialState: GameState, cardTemplates: { [key: string]: CardTemplate }) {
    if (!cardTemplates || Object.keys(cardTemplates).length === 0) {
      console.error("GameEngine: cardTemplates is empty or undefined.", cardTemplates);
      throw new Error("GameEngine must be initialized with valid cardTemplates.");
    }
    // State Hydration: Ensure arrays exist
    initialState.players.forEach(player => {
      player.hand = player.hand || [];
      player.deck = player.deck || [];
      player.discard = player.discard || [];
    });
    initialState.lastActions = initialState.lastActions || [];
    this.state = JSON.parse(JSON.stringify(initialState));
    this.cardTemplates = cardTemplates;
  }

  public getState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public setState(newState: GameState): void {
    this.state = JSON.parse(JSON.stringify(newState));
  }

  public applyAction(player1Action: Action | null, player2Action: Action | null): GameState {
    if (this.state.phase === 'GAME_OVER') return this.getState();
    const newState = this.resolveActions(this.getState(), player1Action, player2Action);
    this.checkWinCondition(newState); // Check win condition AFTER actions are resolved
    this.state = newState;
    return this.getState();
  }

  public advanceTurn(): GameState {
    if (this.state.phase === 'GAME_OVER') return this.getState();

    this.state.turn++;
    this.state.phase = 'DRAW';
    const playerFunds = this.state.players[0].funds;
    const opponentFunds = this.state.players[1].funds;
    this.state.log.push(`ターン${this.state.turn}　プレイヤー資産：${playerFunds} 対戦相手資産：${opponentFunds}`);

    this.state.players.forEach(player => {
      player.discard.push(...player.hand);
      player.hand = [];
    });

    this.state.players.forEach(player => {
      this.drawCards(player, 3);
    });

    this.state.phase = 'ACTION';
    this.state.lastActions = [];
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
    const createPlayer = (id: string, deckData: Deck): PlayerState => {
      const cardsInDeck: Card[] = [];
      for (const templateId in deckData.cards) {
        for (let i = 0; i < deckData.cards[templateId]; i++) {
          cardsInDeck.push({ uuid: crypto.randomUUID(), templateId });
        }
      }
      return {
        playerId: id, funds: 0, properties: 1, hand: [],
        deck: cardsInDeck.sort(() => Math.random() - 0.5),
        discard: [],
      };
    };
    return {
      matchId: `match-${Date.now()}`,
      turn: 0,
      players: [createPlayer(player1Id, player1Deck), createPlayer(player2Id, player2Deck)],
      phase: 'DRAW',
      lastActions: [],
      result: 'IN_PROGRESS',
      log: ['ゲーム開始！'],
    };
  }

  private drawCards(player: PlayerState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) break;
        player.deck = [...player.discard].sort(() => Math.random() - 0.5);
        player.discard = [];
      }
      const drawnCard = player.deck.shift();
      if (drawnCard) player.hand.push(drawnCard);
    }
  }

  private resolveActions(state: GameState, p1Action: Action | null, p2Action: Action | null): GameState {
    let mutableState: GameState = JSON.parse(JSON.stringify(state));
    mutableState.phase = 'RESOLUTION';

    const p1 = mutableState.players.find(p => p.playerId === p1Action?.playerId);
    const p2 = mutableState.players.find(p => p.playerId === p2Action?.playerId);

    const getEffectContext = (player: PlayerState | undefined, action: Action | null, opponent: PlayerState | undefined): EffectContext | null => {
      if (!action || !player) return null;

      let cardInstance: Card | undefined;
      let template: CardTemplate | undefined;

      if (action.actionType === 'collect_funds') {
        template = this.cardTemplates['COLLECT_FUNDS'];
        if (!template) return null;
      } else {
        cardInstance = player.hand.find(c => c.uuid === action.cardUuid);
        if (!cardInstance) return null;
        template = this.cardTemplates[cardInstance.templateId];
        if (!template) return null;
      }

      if (player.funds < template.cost) return null;
      
      return { player, opponent: opponent || player, card: template, isCancelled: false };
    };

    const p1Context = getEffectContext(p1, p1Action, p2);
    const p2Context = getEffectContext(p2, p2Action, p1);

    mutableState.lastActions = [p1Context, p2Context]
      .filter((context): context is EffectContext => !!context)
      .map(context => ({ playerId: context.player.playerId, cardTemplateId: context.card.templateId }));

    [p1Context, p2Context].forEach(context => {
      if (context && context.card.templateId !== 'COLLECT_FUNDS') {
        context.player.funds -= context.card.cost;
        const cardInstance = context.player.hand.find(c => c.templateId === context.card.templateId);
        if (cardInstance) {
          context.player.hand = context.player.hand.filter(c => c.uuid !== cardInstance.uuid);
          context.player.discard.push(cardInstance);
        }
      }
    });

    if (p1Context && p2Context) {
        const p1Card = p1Context.card.templateId;
        const p2Card = p2Context.card.templateId;

        // --- Fraud-specific Interactions first ---
        if (p1Card === 'FRAUD') {
            if (p2Card === 'ACQUIRE') { p2Context.isCancelled = true; } else { p1Context.isCancelled = true; }
        }
        if (p2Card === 'FRAUD') {
            if (p1Card === 'ACQUIRE') { p1Context.isCancelled = true; } else { p2Context.isCancelled = true; }
        }

        // --- Standard Interactions ---
        if (p1Card === 'DEFEND' && p2Card === 'ACQUIRE') { p2Context.isCancelled = true; }
        if (p2Card === 'DEFEND' && p1Card === 'ACQUIRE') { p1Context.isCancelled = true; }
        if (p1Card === 'BRIBE' && p2Context.card.effect.category === 'DEFENSE') { p2Context.isCancelled = true; }
        if (p2Card === 'BRIBE' && p1Context.card.effect.category === 'DEFENSE') { p1Context.isCancelled = true; }
        
        // --- Mutual Cancellation ---
        if (p1Card === p2Card && (p1Card === 'ACQUIRE' || p1Card === 'BRIBE')) {
            p1Context.isCancelled = true;
            p2Context.isCancelled = true;
            mutableState.log.push('両者の行動は互いに打ち消しあった！');
        }
    }

    const contextsToApply = [p1Context, p2Context]
        .filter((c): c is EffectContext => c !== null && !c.isCancelled)
        .sort((a, b) => b.card.effect.priority - a.card.effect.priority);

    for (const context of contextsToApply) {
      for (const effectAction of context.card.effect.actions) {
        mutableState = this.applyEffect(mutableState, context.player.playerId, context.opponent.playerId, effectAction);
      }
      const actionName = context.card.templateId === 'COLLECT_FUNDS' ? '資金集め' : context.card.name;
      mutableState.log.push(`${context.player.playerId === mutableState.players[0].playerId ? 'プレイヤー' : '対戦相手'}の行動「${actionName}」`);
    }

    return mutableState;
  }

  private checkConditions(state: GameState, player: PlayerState, opponent: PlayerState, card: CardTemplate, allPlayedActions: ResolvedAction[]): boolean {
    const conditions = card.effect.conditions;
    if (!conditions) return true;

    if (conditions.hasFunds && player.funds < conditions.hasFunds) return false;
    if (conditions.opponentPlayedCard) {
      const opponentAction = allPlayedActions.find(action => action.playerId === opponent.playerId);
      if (opponentAction?.cardTemplateId !== conditions.opponentPlayedCard) return false;
    }
    if (conditions.opponentHasProperty && opponent.properties < conditions.opponentHasProperty) return false;

    return true;
  }

  private applyEffect(state: GameState, actingPlayerId: string, opponentPlayerId: string, action: EffectAction): GameState {
    const player = state.players.find(p => p.playerId === actingPlayerId);
    if (!player) return state;

    switch (action.name) {
      case 'ACQUIRE_PROPERTY':
        return acquireProperty(state, actingPlayerId, opponentPlayerId, action);
      case 'GAIN_FUNDS':
        return gainFunds(state, actingPlayerId, opponentPlayerId, action);
      case 'CANCEL_EFFECT':
        // Handled in interaction logic
        break;
    }
    return state;
  }

  private checkWinCondition(state: GameState): void {
    const p1Lost = state.players[0].properties <= 0;
    const p2Lost = state.players[1].properties <= 0;

    if (p1Lost || p2Lost) {
      state.phase = 'GAME_OVER'; // Set phase to GAME_OVER
      if (p1Lost && p2Lost) {
        state.result = 'DRAW';
        state.log.push('両者、同時に不動産をすべて失った！引き分け！');
      } else if (p1Lost) {
        state.result = 'LOSE';
        state.log.push(`プレイヤーの不動産が0になった！対戦相手の勝利！`);
      } else { // p2Lost
        state.result = 'WIN';
        state.log.push(`対戦相手の不動産が0になった！プレイヤーの勝利！`);
      }
    }
  }
}
