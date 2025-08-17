import { GameState, Card, Action, CardTemplate } from '../../types';

/**
 * Calculates a weight for each possible action (playing a card or collecting funds)
 * based on the current game state. This function is data-driven, relying on the
 * `effect` object in the CardTemplate.
 * @param gameState The current state of the game.
 * @param hand The AI player's hand.
 * @param cardTemplates A map of all available card templates.
 * @returns A Map where keys are card instance IDs or the command ID, and values are their calculated weights.
 */
export function calculate_weights(
  gameState: GameState,
  hand: Card[],
  cardTemplates: { [templateId: string]: CardTemplate }
): Map<string, number> {
  const weights = new Map<string, number>();
  const npc = gameState.players.find(p => p.playerId === 'npc-player-id');
  const opponent = gameState.players.find(p => p.playerId !== 'npc-player-id');

  if (!npc || !opponent) return weights;

  const canOpponentAcquire = opponent.funds >= (cardTemplates['ACQUIRE']?.cost || 2);
  const canOpponentBribe = opponent.funds >= (cardTemplates['BRIBE']?.cost || 5);

  // --- Card Weight Calculation ---
  hand.forEach(card => {
    const template = cardTemplates[card.templateId];
    if (!template) {
      weights.set(card.id, 0); // Card template not found
      return;
    }

    // Cannot afford the card, give it a very low weight to avoid selection unless no other option.
    if (npc.funds < template.cost) {
      weights.set(card.id, 0.01);
      return;
    }

    let weight = 1.0; // Base weight

    switch (template.effect.category) {
      case 'ATTACK':
        if (opponent.properties > 0) {
          // Prioritize attacking when the opponent has properties
          weight += 5;
          // BRIBE is more valuable if the opponent can defend or fraud
          if (template.templateId === 'BRIBE') {
            weight += 5; // It's a powerful, almost guaranteed hit
          } else { // ACQUIRE
            // If opponent can likely defend, slightly lower the weight of a standard acquire
            if (canOpponentAcquire) weight -= 1;
          }
        } else {
          // Don't attack if opponent has no properties
          weight = 0;
        }
        break;

      case 'DEFENSE':
        // Value defense only if we have property to lose and opponent can attack
        if (npc.properties > 0 && (canOpponentAcquire || canOpponentBribe)) {
            weight += 6;
            // FRAUD is better if opponent is likely to use a standard ACQUIRE
            if (template.templateId === 'FRAUD' && canOpponentAcquire) {
                weight += 2;
            }
        } else {
            weight = 0.1; // Low priority if no threat
        }
        break;

      case 'SUPPORT':
        // INVEST is great when funds are low
        if (template.templateId === 'INVEST') {
          if (npc.funds < 3) {
            weight += 5;
          }
        }
        break;
    }
    weights.set(card.id, weight);
  });

  // --- Collect Funds Command Weight Calculation ---
  let collectFundsWeight = 1.0;
  const affordableCards = hand.filter(card => {
    const template = cardTemplates[card.templateId];
    return template && npc.funds >= template.cost;
  });

  // If no cards are playable, collecting funds is the only good option.
  if (affordableCards.length === 0) {
    collectFundsWeight += 10;
  } else {
    // If funds are very low, collecting is still a decent option.
    if (npc.funds < 2) {
      collectFundsWeight += 3;
    }
  }

  weights.set('COLLECT_FUNDS_COMMAND', collectFundsWeight);

  return weights;
}

/**
 * Chooses a card or command for the NPC to play based on calculated weights.
 * Uses a seed for deterministic random selection.
 * @param gameState The current state of the game.
 * @param hand The AI player's hand.
 * @param seed A seed for the random number generator.
 * @param cardTemplates A map of all available card templates.
 * @returns The chosen Action, or null if no action is possible.
 */
export function choose_card(
  gameState: GameState,
  hand: Card[],
  seed: number,
  cardTemplates: { [templateId: string]: CardTemplate }
): Action | null {
  const npcPlayer = gameState.players.find(p => p.playerId === 'npc-player-id');
  if (!npcPlayer) return null;

  const weights = calculate_weights(gameState, hand, cardTemplates);
  const choices: { id: string; type: 'card' | 'command' }[] = [];
  let totalWeight = 0;

  // Add playable cards to choices
  hand.forEach(card => {
    const template = cardTemplates[card.templateId];
    if (template && npcPlayer.funds >= template.cost) {
        const weight = weights.get(card.id) || 0;
        if (weight > 0) {
            totalWeight += weight;
            choices.push({ id: card.id, type: 'card' });
        }
    }
  });

  // Add collect funds command to choices
  const collectFundsWeight = weights.get('COLLECT_FUNDS_COMMAND') || 0;
  if (collectFundsWeight > 0) {
    totalWeight += collectFundsWeight;
    choices.push({ id: 'COLLECT_FUNDS_COMMAND', type: 'command' });
  }

  if (totalWeight === 0 || choices.length === 0) {
    // If no valid choices, default to collecting funds if possible, otherwise do nothing.
    return npcPlayer ? { playerId: npcPlayer.playerId, actionType: 'collect_funds' } : null;
  }

  // Deterministic random selection based on seed
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  let randomValue = random() * totalWeight;

  for (const choice of choices) {
    const weight = weights.get(choice.id) || 0;
    if (randomValue < weight) {
      if (choice.type === 'card') {
        return { playerId: npcPlayer.playerId, actionType: 'play_card', cardId: choice.id };
      } else {
        return { playerId: npcPlayer.playerId, actionType: 'collect_funds' };
      }
    }
    randomValue -= weight;
  }

  // Fallback in case of floating point inaccuracies, return the last valid choice
  const lastChoice = choices.pop();
  if(lastChoice) {
      if (lastChoice.type === 'card') {
        return { playerId: npcPlayer.playerId, actionType: 'play_card', cardId: lastChoice.id };
      } else {
        return { playerId: npcPlayer.playerId, actionType: 'collect_funds' };
      }
  }

  return null; // Should be unreachable if there are choices
}
