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
    initialState.players.forEach(player => {
      player.hand = player.hand || [];
      player.deck = player.deck || [];
      player.discard = player.discard || [];
    });
    initialState.lastActions = initialState.lastActions || [];
    this.state = JSON.parse(JSON.stringify(initialState)); // Deep copy to ensure immutability
    this.cardTemplates = cardTemplates;
  }

  public getState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
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

    this.state.players.forEach(player => {
      player.discard.push(...player.hand);
      player.hand = [];
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
    const resolvedActions: ResolvedAction[] = [];

    // 1. Prepare data
    const p1 = mutableState.players.find(p => p.playerId === p1Action?.playerId);
    const p2 = mutableState.players.find(p => p.playerId === p2Action?.playerId);

    const getEffectContext = (player: PlayerState | undefined, action: Action | null, opponent: PlayerState | undefined): EffectContext | null => {
      if (!action || !player) return null; // action または player が undefined の場合は null を返す

      // COLLECT_FUNDS コマンドの場合
      if (action.actionType === 'collect_funds') {
        const collectFundsEffectAction: EffectAction = {
          name: 'GAIN_FUNDS',
          value: 1
        };
        // COLLECT_FUNDS は SELF ターゲットなので opponent は不要
        return { player, opponent: opponent || player, card: this.cardTemplates['COLLECT_FUNDS'], isCancelled: false, effectAction: collectFundsEffectAction }; // opponent が undefined の場合は player を設定
      }

      const cardInstance = player.hand.find(c => c.id === action.cardId);
      if (!cardInstance) {
        console.warn(`resolveActions: Card instance ${action.cardId} not found in player ${player.playerId}'s hand.`);
        return null;
      }
      const template = this.cardTemplates[cardInstance.templateId];
      if (!template) {
        console.warn(`resolveActions: Card template ${cardInstance.templateId} not found.`);
        return null;
      }

      // ターゲットが OPPONENT の場合のみ opponent の存在をチェック
      if (template.effect.target === 'OPPONENT' && !opponent) {
        console.warn(`resolveActions: Card ${template.name} targets opponent, but opponent is not defined.`);
        return null;
      }

      if (player.funds < template.cost) {
        console.warn(`resolveActions: Player ${player.playerId} cannot afford card ${template.name}.`);
        return null; // Cannot afford
      }
      return { player, opponent: opponent || player, card: template, isCancelled: false }; // opponent が undefined の場合は player を設定
    };

    const p1Context = getEffectContext(p1, p1Action, p2);
    const p2Context = getEffectContext(p2, p2Action, p1);

    console.log('resolveActions: p1Context:', JSON.parse(JSON.stringify(p1Context)));
    console.log('resolveActions: p2Context:', JSON.parse(JSON.stringify(p2Context)));

    // Pay costs and move cards to discard
    [p1Context, p2Context].forEach(context => {
      if (context && context.card.templateId !== 'COLLECT_FUNDS') {
        context.player.funds -= context.card.cost;
        const cardInstance = context.player.hand.find(c => c.templateId === context.card.templateId)!;
        context.player.hand = context.player.hand.filter(c => c.id !== cardInstance.id);
        context.player.discard.push(cardInstance);
        resolvedActions.push({ playerId: context.player.playerId, cardTemplateId: context.card.templateId });
        mutableState.log.push(`${context.player.playerId === mutableState.players[0].playerId ? 'プレイヤー' : '対戦相手'}の行動「${context.card.name}」`);
      }
    });

    // Add COLLECT_FUNDS actions to resolvedActions
    if (p1Context && p1Context.card.templateId === 'COLLECT_FUNDS') {
      resolvedActions.push({ playerId: p1Context.player.playerId, cardTemplateId: p1Context.card.templateId });
      mutableState.log.push(`${p1Context.player.playerId === mutableState.players[0].playerId ? 'プレイヤー' : '対戦相手'}は資金集めを行った！`);
    }
    if (p2Context && p2Context.card.templateId === 'COLLECT_FUNDS') {
      resolvedActions.push({ playerId: p2Context.player.playerId, cardTemplateId: p2Context.card.templateId });
      mutableState.log.push(`${p2Context.player.playerId === mutableState.players[0].playerId ? 'プレイヤー' : '対戦相手'}は資金集めを行った！`);
    }

    // 2. Determine interaction (cancellation)
    const currentTurnResolvedActions: ResolvedAction[] = [];
    if (p1Context && p1Context.card.templateId !== 'COLLECT_FUNDS') {
        currentTurnResolvedActions.push({ playerId: p1Context.player.playerId, cardTemplateId: p1Context.card.templateId });
    }
    if (p2Context && p2Context.card.templateId !== 'COLLECT_FUNDS') {
        currentTurnResolvedActions.push({ playerId: p2Context.player.playerId, cardTemplateId: p2Context.card.templateId });
    }

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
    const contexts = [p1Context, p2Context].filter(c => c !== null) as EffectContext[];
    contexts.sort((a, b) => b.card.effect.priority - a.card.effect.priority);

    console.log('resolveActions: Sorted contexts for effect application:', JSON.parse(JSON.stringify(contexts)));

    for (const context of contexts) {
      console.log(`resolveActions: Applying effect for ${context.player.playerId}'s ${context.card.name}. isCancelled: ${context.isCancelled}`);
      if (context.isCancelled) {
        mutableState.log.push(`${context.player.playerId === mutableState.players[0].playerId ? 'プレイヤー' : '対戦相手'}の「${context.card.name}」は無効化された！`);
        continue;
      }

      const actionsToApply = context.effectAction ? [context.effectAction] : context.card.effect.actions;
      for (const effectAction of actionsToApply) {
        // Check conditions for the effect action
        if (effectAction.conditions) {
          const conditionsMet = this.checkConditions(mutableState, context.player, context.opponent, context.card, effectAction.conditions, currentTurnResolvedActions);
          if (!conditionsMet) {
            console.log(`resolveActions: Conditions not met for action ${effectAction.name} of ${context.card.name}. Skipping.`);
            continue; // Skip this action if conditions are not met
          }
        }

        console.log(`resolveActions: Applying action ${effectAction.name} for ${context.player.playerId}. Current state before applyEffect:`, JSON.parse(JSON.stringify(mutableState)));
        mutableState = this.applyEffect(mutableState, context.player.playerId, context.opponent.playerId, effectAction);
        console.log(`resolveActions: State after applyEffect:`, JSON.parse(JSON.stringify(mutableState)));
      }
    }
    
    mutableState.lastActions = resolvedActions;
    return mutableState;
  }

  private checkConditions(state: GameState, player: PlayerState, opponent: PlayerState, card: CardTemplate, conditions: { [key: string]: any }, currentTurnResolvedActions: ResolvedAction[]): boolean {
    console.log(`checkConditions: Checking conditions for ${card.name}. Conditions:`, conditions);
    console.log(`checkConditions: Current turn resolved actions:`, JSON.parse(JSON.stringify(currentTurnResolvedActions)));

    if (conditions.opponentCardTemplateId) {
      const opponentPlayedCard = currentTurnResolvedActions.find(a => a.playerId === opponent.playerId);
      console.log(`checkConditions: opponentPlayedCard (by templateId):`, opponentPlayedCard);
      if (!opponentPlayedCard) {
        console.log(`checkConditions: Condition opponentCardTemplateId not met (no opponent card played this turn).`);
        return false;
      }
      if (opponentPlayedCard.cardTemplateId !== conditions.opponentCardTemplateId) {
        console.log(`checkConditions: Condition opponentCardTemplateId not met (templateId mismatch). Expected: ${conditions.opponentCardTemplateId}, Actual: ${opponentPlayedCard.cardTemplateId}`);
        return false;
      }
    }

    if (conditions.opponentCardCategory) {
      const opponentPlayedCard = currentTurnResolvedActions.find(a => a.playerId === opponent.playerId);
      console.log(`checkConditions: opponentPlayedCard (by category):`, opponentPlayedCard);
      if (!opponentPlayedCard) {
        console.log(`checkConditions: Condition opponentCardCategory not met (no opponent card played this turn).`);
        return false;
      }
      const opponentCardTemplate = this.getCardTemplate(opponentPlayedCard.cardTemplateId);
      if (!opponentCardTemplate) {
        console.log(`checkConditions: Condition opponentCardCategory not met (opponent card template not found).`);
        return false;
      }
      if (opponentCardTemplate.effect.category !== conditions.opponentCardCategory) {
        console.log(`checkConditions: Condition opponentCardCategory not met (category mismatch). Expected: ${conditions.opponentCardCategory}, Actual: ${opponentCardTemplate.effect.category}`);
        return false;
      }
    }

    console.log(`checkConditions: All checked conditions met for ${card.name}.`);
    return true; // All checked conditions met
  }

  private applyEffect(state: GameState, actingPlayerId: string, opponentPlayerId: string, action: EffectAction): GameState {
    const player = state.players.find(p => p.playerId === actingPlayerId);
    const opponent = state.players.find(p => p.playerId === opponentPlayerId);

    if (!player || !opponent) return state;

    switch (action.name) {
      case 'ACQUIRE_PROPERTY':
        state = acquireProperty(state, actingPlayerId, opponentPlayerId, action);
        state.log.push(`${player.playerId === state.players[0].playerId ? 'プレイヤー' : '対戦相手'}は不動産を1つ獲得した！`);
        break;
      case 'GAIN_FUNDS':
        state = gainFunds(state, actingPlayerId, opponentPlayerId, action);
        state.log.push(`${player.playerId === state.players[0].playerId ? 'プレイヤー' : '対戦相手'}は${action.value}資金を獲得した！`);
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
      state.phase = 'GAME_OVER';
      if (p1Lost && p2Lost) {
        state.log.push('両者、同時に不動産をすべて失った！引き分け！');
      } else if (p1Lost) {
        state.log.push(`プレイヤーの不動産が0になった！対戦相手の勝利！`);
      } else {
        state.log.push(`対戦相手の不動産が0になった！プレイヤーの勝利！`);
      }
    }
  }
}