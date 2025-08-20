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
  effectAction?: EffectAction; // COLLECT_FUNDS コマンド用
}

export class GameEngine {
  private state: GameState;
  private cardTemplates: { [key: string]: CardTemplate };

  constructor(initialState: GameState, cardTemplates: { [key: string]: CardTemplate }) {
    if (!cardTemplates || Object.keys(cardTemplates).length === 0) {
      console.error("GameEngine: cardTemplates is empty or undefined.", cardTemplates);
      throw new Error("GameEngine must be initialized with valid cardTemplates.");
    }
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
    this.checkWinCondition(newState);
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

    // 各プレイヤーの手札をすべて捨て札に移動
    this.state.players.forEach(player => {
      player.discard.push(...player.hand);
      player.hand = [];
    });

    // その後、各プレイヤーが3枚ドローする
    this.state.players.forEach(player => {
      this.drawCards(player, 3);
    });

    this.state.phase = 'ACTION';
    this.state.lastActions = []; // lastActionsをクリア
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
          cardsInDeck.push({ id: `${templateId}-${i}-${Date.now()}`, templateId });
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
    let mutableState: GameState = JSON.parse(JSON.stringify(state)); // Deep copy
    console.log('resolveActions: Initial state (mutable):', JSON.parse(JSON.stringify(mutableState)));
    console.log('resolveActions: p1Action:', p1Action, 'p2Action:', p2Action);

    mutableState.phase = 'RESOLUTION';
    const resolvedActions: ResolvedAction[] = []; // This will store all resolved actions for the turn

    // 1. Prepare data (EffectContext for each player's action)
    const p1 = mutableState.players.find(p => p.playerId === p1Action?.playerId);
    const p2 = mutableState.players.find(p => p.playerId === p2Action?.playerId);

    const getEffectContext = (player: PlayerState | undefined, action: Action | null, opponent: PlayerState | undefined): EffectContext | null => {
      if (!action || !player) return null;

      let cardInstance: Card | undefined;
      let template: CardTemplate | undefined;

      if (action.actionType === 'collect_funds') {
        template = this.cardTemplates['COLLECT_FUNDS'];
        if (!template) {
          console.warn(`getEffectContext: Card template for COLLECT_FUNDS not found.`);
          return null;
        }
        cardInstance = { id: 'COLLECT_FUNDS_COMMAND', templateId: 'COLLECT_FUNDS' };
      } else {
        cardInstance = player.hand.find(c => c.id === action.cardId);
        if (!cardInstance) {
          console.warn(`getEffectContext: Card instance ${action.cardId} not found in player ${player.playerId}'s hand.`);
          return null;
        }
        template = this.cardTemplates[cardInstance.templateId];
        if (!template) {
          console.warn(`getEffectContext: Card template ${cardInstance.templateId} not found.`);
          return null;
        }
      }

      if (player.funds < template.cost) {
        console.warn(`getEffectContext: Player ${player.playerId} cannot afford card ${template.name}.`);
        return null;
      }
      
      return { player, opponent: opponent || player, card: template, isCancelled: false };
    };

    const p1Context = getEffectContext(p1, p1Action, p2);
    const p2Context = getEffectContext(p2, p2Action, p1);

    // Record all played actions for animation purposes, regardless of cancellation.
    const playedActions: ResolvedAction[] = [];
    if (p1Context) {
      playedActions.push({ playerId: p1Context.player.playerId, cardTemplateId: p1Context.card.templateId });
    }
    if (p2Context) {
      playedActions.push({ playerId: p2Context.player.playerId, cardTemplateId: p2Context.card.templateId });
    }
    mutableState.lastActions = playedActions;

    console.log('resolveActions: p1Context:', JSON.parse(JSON.stringify(p1Context)));
    console.log('resolveActions: p2Context:', JSON.parse(JSON.stringify(p2Context)));

    // Pay costs and move cards to discard (for cards that are not GAIN_FUNDS command)
    [p1Context, p2Context].forEach(context => {
      if (context && context.card.templateId !== 'COLLECT_FUNDS') { // <-- Change 'GAIN_FUNDS' to 'COLLECT_FUNDS'
        context.player.funds -= context.card.cost;
        const cardInstance = context.player.hand.find(c => c.templateId === context.card.templateId);
        if (cardInstance) { // Add a check for cardInstance existence
          context.player.hand = context.player.hand.filter(c => c.id !== cardInstance.id);
          context.player.discard.push(cardInstance);
        } else {
          console.warn(`resolveActions: Card instance for template ${context.card.templateId} not found in hand for player ${context.player.playerId}.`);
        }
    }})

    // 2. Determine interaction (cancellation)
    // This section handles card interactions like DEFEND, FRAUD, ACQUIRE, BRIBE
    // It modifies the `isCancelled` property of the contexts.
    if (p1Context && p2Context) {
        // FRAUD vs ACQUIRE: FRAUD cancels ACQUIRE and steals property
        if (p1Context.card.templateId === 'FRAUD' && p2Context.card.templateId === 'ACQUIRE') {
            p2Context.isCancelled = true;
        }
        if (p2Context.card.templateId === 'FRAUD' && p1Context.card.templateId === 'ACQUIRE') {
            p1Context.isCancelled = true;
        }
        // DEFEND は ACQUIRE を無効化するが、BRIBE は無効化しない
        if (p1Context.card.templateId === 'DEFEND' && p2Context.card.templateId === 'ACQUIRE') p2Context.isCancelled = true;
        if (p2Context.card.templateId === 'DEFEND' && p1Context.card.templateId === 'ACQUIRE') p1Context.isCancelled = true;
        // BRIBE vs DEFEND/FRAUD
        if (p1Context.card.templateId === 'BRIBE' && p2Context.card.effect.category === 'DEFENSE') p2Context.isCancelled = true;
        if (p2Context.card.templateId === 'BRIBE' && p1Context.card.effect.category === 'DEFENSE') p1Context.isCancelled = true;
        // ACQUIRE vs ACQUIRE or BRIBE vs BRIBE
        if (p1Context.card.templateId === p2Context.card.templateId && (p1Context.card.templateId === 'ACQUIRE' || p1Context.card.templateId === 'BRIBE')) {
            p1Context.isCancelled = true;
            p2Context.isCancelled = true;
            mutableState.log.push('両者の行動は互いに打ち消しあった！');
        }
    }

    // 3. Apply effects in order of priority
    const contextsToApply = [p1Context, p2Context].filter(c => c !== null && !c.isCancelled) as EffectContext[];
    contextsToApply.sort((a, b) => b.card.effect.priority - a.card.effect.priority);

    console.log('resolveActions: Sorted contexts for effect application:', JSON.parse(JSON.stringify(contextsToApply)));

    for (const context of contextsToApply) {
      // Apply the effect
      mutableState = this.applyEffect(mutableState, context.player.playerId, context.opponent.playerId, context.card.effect);
      
      // Log the action
      const actionName = context.card.templateId === 'GAIN_FUNDS' ? '資金集め' : context.card.name;
      mutableState.log.push(`${context.player.playerId === mutableState.players[0].playerId ? 'プレイヤー' : '対戦相手'}の行動「${actionName}」`);
      
      // This is no longer needed as lastActions is set before cancellation.
      // currentTurnResolvedActions.push({ playerId: context.player.playerId, cardTemplateId: context.card.templateId });
    }

    // mutableState.lastActions = currentTurnResolvedActions; // This is moved before cancellation logic.

    console.log('resolveActions: Final state after actions:', JSON.parse(JSON.stringify(mutableState)));
    return mutableState;
  }

  private checkConditions(state: GameState, player: PlayerState, opponent: PlayerState, card: CardTemplate, conditions: { [key: string]: any }, currentTurnResolvedActions: ResolvedAction[]): boolean {
    console.log(`checkConditions: Checking conditions for ${card.name}. Conditions:`, conditions);
    console.log(`checkConditions: Current turn resolved actions:`, JSON.parse(JSON.stringify(currentTurnResolvedActions)));

    if (conditions.hasFunds) {
      if (player.funds < conditions.hasFunds) {
        console.log(`checkConditions: Player ${player.id} does not have enough funds. Required: ${conditions.hasFunds}, Actual: ${player.funds}`);
        return false;
      }
    }

    if (conditions.opponentPlayedCard) {
      const opponentPlayedCardId = currentTurnResolvedActions.find(
        (action) => action.playerId === opponent.id
      )?.cardId;
      if (opponentPlayedCardId !== conditions.opponentPlayedCard) {
        console.log(`checkConditions: Opponent did not play the required card. Expected: ${conditions.opponentPlayedCard}, Actual: ${opponentPlayedCardId}`);
        return false;
      }
    }

    if (conditions.opponentHasProperty) {
      if (opponent.properties < conditions.opponentHasProperty) {
        console.log(`checkConditions: Opponent does not have enough properties. Required: ${conditions.opponentHasProperty}, Actual: ${opponent.properties}`);
        return false;
      }
    }

    console.log(`checkConditions: All conditions met for ${card.name}.`);
    return true;
  }

  private applyEffect(state: GameState, actingPlayerId: string, opponentPlayerId: string | undefined, action: EffectAction): GameState {
    const player = state.players.find(p => p.playerId === actingPlayerId);
    if (!player) return state; // Acting player must exist

    const opponent = opponentPlayerId ? state.players.find(p => p.playerId === opponentPlayerId) : undefined;

    switch (action.actions[0].name) {
      case 'ACQUIRE_PROPERTY':
        if (!opponent) {
          console.warn(`ACQUIRE_PROPERTY requires an opponent, but opponentPlayerId was not provided.`);
          return state;
        }
        state = acquireProperty(state, actingPlayerId, opponentPlayerId, action.actions[0]);
        state.log.push(`${player.playerId === state.players[0].playerId ? 'プレイヤー' : '対戦相手'}は不動産を1つ獲得した！`);
        break;
      case 'GAIN_FUNDS':
        // Opponent is not required for GAIN_FUNDS
        state = gainFunds(state, actingPlayerId, opponentPlayerId, action.actions[0]);
        state.log.push(`${player.playerId === state.players[0].playerId ? 'プレイヤー' : '対戦相手'}は${action.actions[0].value}資金を獲得した！`);
        break;
      case 'CANCEL_EFFECT':
        // This is handled in the interaction logic before applyEffect is called.
        break;
    }
    return state;
  }

  private checkWinCondition(state: GameState): void {
    const p1Lost = state.players[0].properties <= 0;
    const p2Lost = state.players[1].properties <= 0;

    if (p1Lost || p2Lost) {
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