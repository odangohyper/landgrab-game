import React, { useState, useEffect } from 'react';
import { CardTemplate } from '../types';
import styles from './DeckInfo.module.css';
import useLongPress from '../hooks/useLongPress';

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

const CardEditItem: React.FC<{ 
  card: CardTemplate;
  count: number;
  totalCount: number;
  onCountChange: (cardId: string, delta: number) => void;
  onShowCardDetails: (card: CardTemplate) => void;
}> = ({ card, count, totalCount, onCountChange, onShowCardDetails }) => {

  const handleLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    if ('preventDefault' in e) {
        e.preventDefault();
    }
    onShowCardDetails(card);
  };

  const handleClick = () => {}; // Regular click on the image does nothing

  const longPressEvents = useLongPress(handleLongPress, handleClick, { delay: 500 });

  return (
    <div 
      className={styles['card-item']}
      onContextMenu={(e) => {
        e.preventDefault();
        onShowCardDetails(card);
      }}
    >
      <div {...longPressEvents}>
        <img src={`/images/cards/${card.templateId}.jpg`} alt={card.name} className={styles['card-image']} />
      </div>
      <div className={styles['card-controls']}>
        <span>{card.name} ({count})</span>
        <div className={styles['card-buttons']}>
          <button onClick={() => onCountChange(card.templateId, -1)} disabled={count === 0}>-</button>
          <button onClick={() => onCountChange(card.templateId, 1)} disabled={totalCount >= 10}>+</button>
        </div>
      </div>
    </div>
  );
};


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
      if (newCount < 0) return prev;

      if (delta > 0 && newCount > 4) {
        alert('同じカードは4枚までです。');
        return prev;
      }

      const currentTotalCards = Object.values(prev).reduce((sum, count) => sum + count, 0);
      if (delta > 0 && currentTotalCards >= 10) {
        alert('デッキは10枚までです。');
        return prev;
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
          <CardEditItem
            key={card.templateId}
            card={card}
            count={selectedCards[card.templateId] || 0}
            totalCount={currentTotalCards}
            onCountChange={handleCardCountChange}
            onShowCardDetails={onShowCardDetails}
          />
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