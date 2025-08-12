// packages/web-game-client/src/components/DeckBuilder.tsx

import React, { useState, useEffect } from 'react';
import { CardTemplate } from '../types';
import { fetchCardTemplates } from '../api/realtimeClient'; // Import fetchCardTemplates

interface DeckBuilderProps {
  // Props will be added later, e.g., currentDeck
}

const DeckBuilder: React.FC<DeckBuilderProps> = () => {
  const [availableCardTemplates, setAvailableCardTemplates] = useState<{ [templateId: string]: CardTemplate }>({});
  const [currentDeck, setCurrentDeck] = useState<CardTemplate[]>([]);

  useEffect(() => {
    const loadCardTemplates = async () => {
      const fetchedTemplates = await fetchCardTemplates('v1'); // Fetch from DB
      setAvailableCardTemplates(fetchedTemplates);
    };
    loadCardTemplates();
  }, []);

  const handleAddCardToDeck = (cardTemplate: CardTemplate) => {
    if (currentDeck.length < 10) {
      setCurrentDeck([...currentDeck, cardTemplate]);
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
            {Object.values(availableCardTemplates).map((card) => {
              const imageUrl = `/images/cards/${card.templateId}.jpg`; // Assuming .jpg
              return (
                <div key={card.templateId} style={{ border: '1px solid gray', margin: '5px', padding: '5px', display: 'flex', alignItems: 'center' }}>
                  {imageUrl && <img src={imageUrl} alt={card.name} style={{ width: '50px', height: 'auto', marginRight: '10px' }} />}
                  <div>
                    <h4>{card.name} (コスト: {card.cost})</h4>
                    <p style={{ fontSize: '0.8em' }}>{card.description}</p>
                    <button onClick={() => handleAddCardToDeck(card)}>デッキに追加</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Deck */}
        <div style={{ border: '1px solid lightgray', padding: '10px', width: '45%' }}>
          <h3>現在のデッキ ({currentDeck.length}/10)</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {currentDeck.length === 0 ? (
              <p>デッキにカードがありません。</p>
            ) : (
              currentDeck.map((card, index) => {
                const imageUrl = `/images/cards/${card.templateId}.jpg`; // Assuming .jpg
                return (
                  <div key={index} style={{ border: '1px solid gray', margin: '5px', padding: '5px', display: 'flex', alignItems: 'center' }}>
                    {imageUrl && <img src={imageUrl} alt={card.name} style={{ width: '50px', height: 'auto', marginRight: '10px' }} />}
                    <div>
                      <h4>{card.name}</h4>
                      <button onClick={() => handleRemoveCardFromDeck(index)}>デッキから削除</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* Save Deck Button will go here */}
    </div>
  );
};

export default DeckBuilder;
