// packages/web-game-client/src/game/ai/ai.ts

import { GameState, Card, Action } from '../../types';

/**
 * ゲームの状態とNPCの手札に基づいて、各カードの重みを計算します。
 * これは純粋関数であるべきです。
 * @param gameState 現在のゲームの状態
 * @param hand NPCの手札
 * @returns 各カードIDとその重みのマップ
 */
export function calculate_weights(gameState: GameState, hand: Card[]): Map<string, number> {
  const weights = new Map<string, number>();

  // 仮の重み付けロジック
  // 今は単純に、コストが低いカードに高い重みを与える
  // 実際のAIでは、資金、不動産、相手の手札（推測）、ターン数などを考慮する
  hand.forEach(card => {
    // ここではCardTemplateの情報が必要になるが、engineから取得するか、別途渡す必要がある
    // 現状は仮の重み
    let weight = 1;
    if (card.templateId === 'GAIN_FUNDS') {
      weight = 3; // 資金集めを優先
    } else if (card.templateId === 'ACQUIRE') {
      weight = 2; // 買収もそこそこ
    } else if (card.templateId === 'DEFEND') {
      weight = 1; // 防衛は状況次第
    } else if (card.templateId === 'FRAUD') {
      weight = 2; // 詐欺もそこそこ
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
 * @returns 選択されたカード、またはnull（選択しない場合）
 */
export function choose_card(gameState: GameState, hand: Card[], seed: number): Card | null {
  if (hand.length === 0) {
    return null;
  }

  const weights = calculate_weights(gameState, hand);

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
    return hand[Math.floor(random() * hand.length)]; // 重みがなければランダム
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
