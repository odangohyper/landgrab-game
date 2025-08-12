// packages/web-game-client/src/components/DeckBuilder.tsx

import React, { useState, useEffect } from 'react';
import { CardTemplate } from '../types'; // Assuming CardTemplate is needed

interface DeckBuilderProps {
  // Props will be added later, e.g., availableCardTemplates, currentDeck
}

const DeckBuilder: React.FC<DeckBuilderProps> = () => {
  const [availableCards, setAvailableCards] = useState<CardTemplate[]>([]);
  const [currentDeck, setCurrentDeck] = useState<CardTemplate[]>([]);

  useEffect(() => {
    // Simulate fetching available card templates
    // In a real scenario, this would come from Realtime Database or API
    const dummyCardTemplates: CardTemplate[] = [
      { templateId: 'GAIN_FUNDS', name: '資金集め', cost: 0, type: 'GAIN_FUNDS', description: '資金が2増加します。' },
      { templateId: 'ACQUIRE', name: '買収', cost: 2, type: 'ACQUIRE', description: '相手の不動産を1つ奪います。' },
      { templateId: 'DEFEND', name: '防衛', cost: 0, type: 'DEFEND', description: '相手の「買収」を無効化します。' },
      { templateId: 'FRAUD', name: '詐欺', cost: 1, type: 'FRAUD', description: '相手が「買収」を出していた場合、それを無効にし、代わりに相手の不動産を1つ奪います。' },
      // Add more dummy cards for variety
      { templateId: 'STEAL_FUNDS', name: '窃盗', cost: 1, type: 'GAIN_FUNDS', description: '相手の資金を1奪います。' }, // Example of future card
    ];
    setAvailableCards(dummyCardTemplates);
  }, []);

  const handleAddCardToDeck = (card: CardTemplate) => {
    // Limit deck size to 10 as per GEMINI.md
    if (currentDeck.length < 10) {
      setCurrentDeck([...currentDeck, card]);
    } else {
      alert('デッキは10枚までです！');
    }
  };

  const handleRemoveCardFromDeck = (index: number) => {
    const newDeck = [...currentDeck];
    newDeck.splice(index, 1);
    setCurrentDeck(newDeck);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2>デッキ構築</h2>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
        {/* Available Cards */}
        <div style={{ border: '1px solid lightgray', padding: '10px', width: '45%' }}>
          <h3>利用可能なカード</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {availableCards.map((card) => (
              <div key={card.templateId} style={{ border: '1px solid gray', margin: '5px', padding: '5px' }}>
                <h4>{card.name} (コスト: {card.cost})</h4>
                <p>{card.description}</p>
                <button onClick={() => handleAddCardToDeck(card)}>デッキに追加</button>
              </div>
            ))}
          </div>
        </div>

        {/* Current Deck */}
        <div style={{ border: '1px solid lightgray', padding: '10px', width: '45%' }}>
          <h3>現在のデッキ ({currentDeck.length}/10)</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {currentDeck.length === 0 ? (
              <p>デッキにカードがありません。</p>
            ) : (
              currentDeck.map((card, index) => (
                <div key={index} style={{ border: '1px solid gray', margin: '5px', padding: '5px' }}>
                  <h4>{card.name}</h4>
                  <button onClick={() => handleRemoveCardFromDeck(index)}>デッキから削除</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Save Deck Button will go here */}
    </div>
  );
};

export default DeckBuilder;
