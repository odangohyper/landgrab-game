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
  hand: CardInstance[],
  cardTemplates: { [templateId: string]: CardTemplate }
): Map<string, number> {
  const weights = new Map<string, number>();
  const npc = gameState.players.find(p => p.playerId === 'npc-player-id');
  const opponent = gameState.players.find(p => p.playerId !== 'npc-player-id');

  if (!npc || !opponent) return weights;

  console.log('AI: calculate_weights - Input State:', { npcFunds: npc.funds, npcProperties: npc.properties, opponentProperties: opponent.properties, hand: hand.map(c => c.templateId) });

  const canOpponentAcquire = opponent.funds >= (cardTemplates['ACQUIRE']?.cost || 2);
  const canOpponentBribe = opponent.funds >= (cardTemplates['BRIBE']?.cost || 5);

  // --- Card Weight Calculation ---
  hand.forEach(card => {
    const template = cardTemplates[card.templateId];
    if (!template) {
      weights.set(card.uuid, 0); // Card template not found
      console.log(`AI: Card ${card.templateId} (${card.uuid}) - Template not found, weight: 0`);
      return;
    }

    // Cannot afford the card, give it a very low weight to avoid selection unless no other option.
    if (npc.funds < template.cost) {
      weights.set(card.uuid, 0.01);
      console.log(`AI: Card ${card.templateId} (${card.uuid}) - Unaffordable (Funds: ${npc.funds}, Cost: ${template.cost}), weight: 0.01`);
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
    weights.set(card.uuid, weight);
    console.log(`AI: Card ${template.templateId} (${card.uuid}) - Calculated weight: ${weight}`);
  });

  // --- Collect Funds Command Weight Calculation ---
  let collectFundsWeight = 1.0;
  const affordableCards = hand.filter(card => {
    const template = cardTemplates[card.templateId];
    return template && npc.funds >= template.cost;
  });

  console.log(`AI: Collect Funds - Affordable cards count: ${affordableCards.length}`);

  // If no cards are playable, collecting funds is the only good option.
  if (affordableCards.length === 0) {
    collectFundsWeight += 10;
    console.log('AI: Collect Funds - No affordable cards, boosting weight by 10.');
  } else {
    // If funds are very low, collecting is still a decent option.
    if (npc.funds < 2) {
      collectFundsWeight += 3;
      console.log('AI: Collect Funds - Funds very low (<2), boosting weight by 3.');
    }
  }

  weights.set('COLLECT_FUNDS_COMMAND', collectFundsWeight);
  console.log(`AI: Collect Funds - Final weight: ${collectFundsWeight}`);

  console.log('AI: calculate_weights - Final Weights Map:', weights);
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
  hand: CardInstance[],
  seed: number,
  cardTemplates: { [templateId: string]: CardTemplate }
): Action | null {
  const npcPlayer = gameState.players.find(p => p.playerId === 'npc-player-id');
  if (!npcPlayer) return null;

  console.log('AI: choose_card - Input State:', { npcFunds: npcPlayer.funds, hand: hand.map(c => c.templateId) });

  const weights = calculate_weights(gameState, hand, cardTemplates);
  console.log('AI: choose_card - Weights from calculate_weights:', weights);

  const choices: { uuid: string; type: 'card' | 'command' }[] = [];
  let totalWeight = 0;

  // Add playable cards to choices
  hand.forEach(card => {
    const template = cardTemplates[card.templateId];
    const canAfford = template && npcPlayer.funds >= template.cost;
    const weight = weights.get(card.uuid) || 0;

    console.log(`AI: choose_card - Evaluating card ${card.templateId} (${card.uuid}): Can afford: ${canAfford}, Weight: ${weight}`);

    if (canAfford && weight > 0) {
        totalWeight += weight;
        choices.push({ uuid: card.uuid, type: 'card' });
        console.log(`AI: choose_card - Added card ${card.templateId} to choices. Current totalWeight: ${totalWeight}`);
    }
  });

  // Add collect funds command to choices
  const collectFundsWeight = weights.get('COLLECT_FUNDS_COMMAND') || 0;
  console.log(`AI: choose_card - Evaluating COLLECT_FUNDS_COMMAND: Weight: ${collectFundsWeight}`);
  if (collectFundsWeight > 0) {
    totalWeight += collectFundsWeight;
    choices.push({ id: 'COLLECT_FUNDS_COMMAND', type: 'command' });
    console.log(`AI: choose_card - Added COLLECT_FUNDS_COMMAND to choices. Current totalWeight: ${totalWeight}`);
  }

  console.log('AI: choose_card - Final choices array:', choices);
  console.log('AI: choose_card - Final totalWeight:', totalWeight);

  if (totalWeight === 0 || choices.length === 0) {
    // If no valid choices, default to collecting funds if possible, otherwise do nothing.
    console.log('AI: choose_card - No valid choices (totalWeight is 0 or choices array is empty). Defaulting to COLLECT_FUNDS.');
    return npcPlayer ? { playerId: npcPlayer.playerId, actionType: 'collect_funds' } : null;
  }

  // Deterministic random selection based on seed
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  let randomValue = random() * totalWeight;
  console.log(`AI: choose_card - Random value for selection: ${randomValue} (out of ${totalWeight})`);

  for (const choice of choices) {
    const weight = weights.get(choice.id || choice.uuid) || 0; // Use choice.id for command, choice.uuid for card
    console.log(`AI: choose_card - Checking choice ${choice.id || choice.uuid} (Weight: ${weight}). randomValue: ${randomValue}`);
    if (randomValue < weight) {
      if (choice.type === 'card') {
        console.log(`AI: choose_card - Selected card: ${choice.uuid}`);
        return { playerId: npcPlayer.playerId, actionType: 'play_card', cardUuid: choice.uuid };
      }
      else {
        console.log('AI: choose_card - Selected command: COLLECT_FUNDS');
        return { playerId: npcPlayer.playerId, actionType: 'collect_funds' };
      }
    }
    randomValue -= weight;
    console.log(`AI: choose_card - randomValue after subtraction: ${randomValue}`);
  }

  // Fallback in case of floating point inaccuracies, return the last valid choice
  const lastChoice = choices.pop();
  if(lastChoice) {
      console.log(`AI: choose_card - Fallback: Returning last choice ${lastChoice.id || lastChoice.uuid}`);
      if (lastChoice.type === 'card') {
        return { playerId: npcPlayer.playerId, actionType: 'play_card', cardUuid: lastChoice.uuid };
      } else {
        return { playerId: npcPlayer.playerId, actionType: 'collect_funds' };
      }
  }

  console.log('AI: choose_card - Should not reach here. Returning null.');
  return null; // Should be unreachable if there are choices
}
