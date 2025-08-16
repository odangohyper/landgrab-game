import { GameState, Card, Action, CardTemplate } from '../../types';

/**
 * ゲームの状態、NPCの手札、利用可能なカードテンプレートに基づいて、各カードの重みを計算します。
 * これは純粋関数であるべきです。
 * @param gameState 現在のゲームの状態
 * @param hand NPCの手札
 * @param cardTemplates すべてのカードテンプレート（templateIdをキーとするマップ）
 * @returns 各カードIDとその重みのマップ
 */
export function calculate_weights(
  gameState: GameState,
  hand: Card[],
  cardTemplates: { [templateId: string]: CardTemplate }
): Map<string, number> {
  const weights = new Map<string, number>();
  const npcPlayer = gameState.players.find(p => p.playerId === 'npc-player-id');
  if (!npcPlayer) return weights;

  const opponentPlayer = gameState.players.find(p => p.playerId !== npcPlayer.playerId);
  if (!opponentPlayer) return weights;

  hand.forEach(card => {
    const template = cardTemplates[card.templateId];
    if (!template) {
      weights.set(card.id, 0);
      return;
    }

    let weight = 1;
    let opponentCanAcquire = opponentPlayer.funds >= (cardTemplates['ACQUIRE']?.cost || 2); // Declare and initialize here

    if (npcPlayer.funds < template.cost) {
      weights.set(card.id, 0.01);
      return;
    }

    switch (template.type) {
      case 'ACQUIRE':
        if (opponentPlayer.properties > 1) {
          weight += 4;
        } else if (opponentPlayer.properties === 1) {
          weight += 2;
        }
        if (npcPlayer.funds >= template.cost) {
          weight += 3;
        }
        break;

      case 'DEFEND':
        opponentCanAcquire = opponentPlayer.funds >= (cardTemplates['ACQUIRE']?.cost || 2);
        if (opponentCanAcquire && npcPlayer.properties > 0) {
          weight += 4;
        }
        break;

      case 'FRAUD':
        const fraudCost = template.cost;
        if (npcPlayer.funds >= fraudCost && opponentPlayer.properties > 0 && opponentCanAcquire) {
          weight += 5;
        }
        break;
    }
    weights.set(card.id, weight);
  });

  let collectFundsWeight = 1;
  if (npcPlayer.funds < 1) {
    collectFundsWeight += 10;
  } else if (npcPlayer.funds < 2) {
    collectFundsWeight += 5;
  }

  const canPlayAnyCard = hand.some(card => {
    const template = cardTemplates[card.templateId];
    return template && npcPlayer.funds >= template.cost;
  });

  if (!canPlayAnyCard) {
    collectFundsWeight += 7;
  }

  weights.set('COLLECT_FUNDS_COMMAND', collectFundsWeight);

  return weights;
}

/**
 * 計算された重みに基づいて、NPCがプレイするカードを選択します。
 * シード値を使って再現性を確保します。
 * @param gameState 現在のゲームの状態
 * @param hand NPCの手札
 * @param seed 乱数生成のためのシード値
 * @param cardTemplates すべてのカードテンプレート（templateIdをキーとするマップ）
 * @returns 選択されたカード、またはnull（選択しない場合）
 */
export function choose_card(
  gameState: GameState,
  hand: Card[],
  seed: number,
  cardTemplates: { [templateId: string]: CardTemplate }
): Action | null {
  const npcPlayer = gameState.players.find(p => p.playerId === 'npc-player-id');
  if (!npcPlayer) return null;

  console.log('ai.ts: choose_card: npcPlayer.playerId:', npcPlayer.playerId);

  const weights = calculate_weights(gameState, hand, cardTemplates);

  if (hand.length === 0 && (weights.get('COLLECT_FUNDS_COMMAND') || 0) === 0) {
    return null;
  }

  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  let totalWeight = 0;
  const choices: { id: string; type: 'card' | 'command' }[] = [];

  hand.forEach(card => {
    const weight = weights.get(card.id) || 0;
    if (weight > 0) {
      totalWeight += weight;
      choices.push({ id: card.id, type: 'card' });
    }
  });

  const collectFundsWeight = weights.get('COLLECT_FUNDS_COMMAND') || 0;
  if (collectFundsWeight > 0) {
    totalWeight += collectFundsWeight;
    choices.push({ id: 'COLLECT_FUNDS_COMMAND', type: 'command' });
  }

  if (totalWeight === 0) {
    return null;
  }

  let randomValue = random() * totalWeight;

  for (const choice of choices) {
    const weight = weights.get(choice.id) || 0;
    if (randomValue < weight) {
      if (choice.type === 'card') {
        console.log('ai.ts: choose_card: Returning card action for playerId:', npcPlayer.playerId);
        return { playerId: npcPlayer.playerId, actionType: 'play_card', cardId: choice.id };
      } else {
        console.log('ai.ts: choose_card: Returning command action for playerId:', npcPlayer.playerId);
        return { playerId: npcPlayer.playerId, actionType: 'collect_funds' };
      }
    }
    randomValue -= weight;
  }

  return null;
}