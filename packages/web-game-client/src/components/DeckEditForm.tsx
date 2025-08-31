import React, { useState, useEffect } from 'react';
import { CardTemplate } from '../types';
import styles from './DeckInfo.module.css';

interface DeckEditFormProps {
  deck: {
    id?: string;
    name: string;
    cards: { [cardId: string]: number };
  };
  availableCardTemplates: CardTemplate[];
  onSave: (deck: { id?: string; name: string; cards: { [cardId: string]: number } }) => void;
  onCancel: () => void;
  onShowCardDetails: (card: CardTemplate) => void;
}

const DeckEditForm: React.FC<DeckEditFormProps> = ({ deck, availableCardTemplates, onSave, onCancel, onShowCardDetails }) => {
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
      return newSelectedCards;
    });
  };

  const currentTotalCards = Object.values(selectedCards).reduce((sum, count) => sum + count, 0);

  const handleSave = () => {
    if (!deckName.trim()) {
      alert('デッキ名を入力してください。');
      return;
    }
    if (currentTotalCards !== 10) {
      alert(`デッキは10枚である必要があります。現在: ${currentTotalCards}枚`);
      return;
    }
    onSave({ ...deck, name: deckName, cards: selectedCards });
  };

  const handleContextMenu = (e: React.MouseEvent, card: CardTemplate) => {
    e.preventDefault();
    onShowCardDetails(card);
  };

  return (
    <div className={styles['deck-edit-form']}>
      <h2>{deck.id ? 'デッキを編集' : '新しいデッキを作成'}</h2>
      <div className={styles['form-group']}>
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
      <div className={styles['card-selection-grid']}>
        {availableCardTemplates.map(card => (
          <div 
            key={card.templateId} 
            className={styles['card-item']}
            onContextMenu={(e) => handleContextMenu(e, card)}
          >
            <img src={`/images/cards/${card.templateId}.jpg`} alt={card.name} className={styles['card-image']} />
            <div className={styles['card-controls']}>
              <span>{card.name} ({selectedCards[card.templateId] || 0})</span>
              <div className={styles['card-buttons']}>
                <button onClick={() => handleCardCountChange(card.templateId, -1)} disabled={(selectedCards[card.templateId] || 0) === 0}>-</button>
                <button onClick={() => handleCardCountChange(card.templateId, 1)} disabled={currentTotalCards >= 10}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles['form-actions']}>
        <button onClick={handleSave} disabled={currentTotalCards !== 10}>保存</button>
        <button onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
};

export default DeckEditForm;