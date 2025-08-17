import React, { useState, useEffect } from 'react';
import { CardTemplate } from '../types';
import './DeckInfo.css'; // Assuming DeckInfo.css contains relevant styles

interface DeckEditFormProps {
  deck: {
    id?: string;
    name: string;
    cards: { [cardId: string]: number };
  };
  availableCardTemplates: CardTemplate[];
  onSave: (deck: { id?: string; name: string; cards: { [cardId: string]: number } }) => void;
  onCancel: () => void;
}

const DeckEditForm: React.FC<DeckEditFormProps> = ({ deck, availableCardTemplates, onSave, onCancel }) => {
  const [deckName, setDeckName] = useState(deck.name);
  const [selectedCards, setSelectedCards] = useState<{ [cardId: string]: number }>(deck.cards);

  useEffect(() => {
    setDeckName(deck.name);
    setSelectedCards(deck.cards);
  }, [deck]);

  const handleCardCountChange = (cardId: string, delta: number) => {
    setSelectedCards(prev => {
      const newCount = (prev[cardId] || 0) + delta;
      if (newCount < 0) return prev; // Cannot go below 0

      // Enforce per-card limit (max 4 copies)
      if (delta > 0 && newCount > 4) {
        alert('同じカードは4枚までです。');
        return prev;
      }

      const currentTotalCards = Object.values(prev).reduce((sum, count) => sum + count, 0);
      if (delta > 0 && currentTotalCards >= 10) {
        alert('デッキは10枚までです。'); // Corrected alert message
        return prev; // Cannot exceed 10 cards
      }

      const newSelectedCards = { ...prev };
      if (newCount === 0) {
        delete newSelectedCards[cardId];
      } else {
        newSelectedCards[cardId] = newCount;
      }
      console.log('selectedCards after update:', newSelectedCards); // ADDED LOG
      return newSelectedCards;
    });
  };

  const currentTotalCards = Object.values(selectedCards).reduce((sum, count) => sum + count, 0);
  console.log('currentTotalCards:', currentTotalCards); // ADDED LOG

  const handleSave = () => {
    console.log('handleSave called. currentTotalCards:', currentTotalCards); // ADDED LOG
    if (!deckName.trim()) {
      alert('デッキ名を入力してください。');
      return;
    }
    if (currentTotalCards !== 10) {
      alert(`デッキは10枚である必要があります。現在: ${currentTotalCards}枚`);
      return;
    }
    console.log('Calling onSave with:', { ...deck, name: deckName, cards: selectedCards }); // ADDED LOG
    onSave({ ...deck, name: deckName, cards: selectedCards });
  };

  return (
    <div className="deck-edit-form">
      <h2>{deck.id ? 'デッキを編集' : '新しいデッキを作成'}</h2>
      <div className="form-group">
        <label htmlFor="deckName">デッキ名:</label>
        <input
          type="text"
          id="deckName"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="デッキ名を入力"
        />
      </div>

      <h3>カード選択 ({currentTotalCards}/10)</h3>
      <div className="card-selection-grid">
        {availableCardTemplates.map(card => (
          <div key={card.templateId} className="card-item">
            <img src={`/images/cards/${card.templateId}.jpg`} alt={card.name} className="card-image" />
            <div className="card-controls">
              <span>{card.name} ({selectedCards[card.templateId] || 0})</span>
              <div className="card-buttons">
                <button onClick={() => handleCardCountChange(card.templateId, -1)} disabled={(selectedCards[card.templateId] || 0) === 0}>-</button>
                <button onClick={() => handleCardCountChange(card.templateId, 1)} disabled={currentTotalCards >= 10}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button onClick={handleSave} disabled={currentTotalCards !== 10}>保存</button>
        <button onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
};

export default DeckEditForm;