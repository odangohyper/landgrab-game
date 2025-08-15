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
  const npcPlayer = gameState.players.find(p => p.playerId === hand[0]?.playerId); // Assuming all cards in hand belong to the same player
  if (!npcPlayer) return weights; // Should not happen

  const opponentPlayer = gameState.players.find(p => p.playerId !== npcPlayer.playerId);
  if (!opponentPlayer) return weights; // Should not happen in a 2-player game

  hand.forEach(card => {
    const template = cardTemplates[card.templateId];
    if (!template) {
      weights.set(card.id, 0); // Unknown card, assign 0 weight
      return;
    }

    let weight = 1; // Default weight

    // コストが足りないカードはプレイできないため、重みを非常に低くする
    if (npcPlayer.funds < template.cost) {
      weights.set(card.id, 0.01); // ほぼ選ばれないようにするが、完全に0ではない
      return;
    }

    switch (template.type) {
      case 'GAIN_FUNDS':
        // 資金が少ない場合は優先度を上げる
        if (npcPlayer.funds < 2) {
          weight += 5;
        } else if (npcPlayer.funds < 4) {
          weight += 3;
        }
        // 買収に必要な資金がない場合も優先度を上げる
        const acquireCost = cardTemplates['ACQUIRE']?.cost || 2; // 仮の買収コスト
        if (npcPlayer.funds < acquireCost) {
          weight += 2;
        }
        break;

      case 'ACQUIRE':
        // 相手の不動産が多いほど優先度を上げる
        if (opponentPlayer.properties > 1) {
          weight += 4;
        } else if (opponentPlayer.properties === 1) {
          weight += 2;
        }
        // 自分の資金が十分にある場合のみ考慮
        if (npcPlayer.funds >= template.cost) {
          weight += 3;
        }
        break;

      case 'DEFEND':
        // 相手の資金が多い、かつ不動産を狙われそうな場合（相手がACQUIREをプレイしそう）に優先度を上げる
        // 相手がACQUIREをプレイする可能性を推測する簡易ロジック
        const opponentCanAcquire = opponentPlayer.funds >= (cardTemplates['ACQUIRE']?.cost || 2);
        if (opponentCanAcquire && npcPlayer.properties > 0) {
          weight += 4;
        }
        break;

      case 'FRAUD':
        // 相手がACQUIREをプレイしそうな場合に優先度を上げる
        // DEFENDよりも攻撃的な選択肢
        const fraudCost = template.cost;
        if (npcPlayer.funds >= fraudCost && opponentPlayer.properties > 0 && opponentCanAcquire) {
          weight += 5; // 詐欺が成功すると強力
        }
        break;
    }
    weights.set(card.id, weight);
  });

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
): Card | null {
  if (hand.length === 0) {
    return null;
  }

  // calculate_weightsにcardTemplatesを渡す
  const weights = calculate_weights(gameState, hand, cardTemplates);

  // シード値を使った乱数生成 (簡易版)
  // 実際にはより堅牢なPRNGライブラリを使用する
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  let totalWeight = 0;
  for (const weight of weights.values()) {
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    // 全てのカードの重みが0の場合、ランダムに選択するか、何もプレイしない選択肢も考慮する
    // 現状はランダムに選択
    return hand[Math.floor(random() * hand.length)];
  }

  let randomValue = random() * totalWeight;
  for (const card of hand) {
    const weight = weights.get(card.id) || 0;
    if (randomValue < weight) {
      return card;
    }
    randomValue -= weight;
  }

  // フォールバック (通常は到達しないはず)
  return hand[Math.floor(random() * hand.length)];
}