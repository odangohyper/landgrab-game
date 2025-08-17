import React from 'react';
import { Deck, CardTemplate } from '../types'; // Added CardTemplate import

interface SavedDecksListProps {
  decks: Deck[];
  selectedDeckId: string | null;
  onSelectDeck: (deckId: string) => void;
  onEditDeck: (deck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  availableCardTemplates: CardTemplate[]; // ADDED PROP
}

const SavedDecksList: React.FC<SavedDecksListProps> = ({
  decks,
  selectedDeckId,
  onSelectDeck,
  onEditDeck,
  onDeleteDeck,
  availableCardTemplates, // ADDED
}) => {
  if (decks.length === 0) {
    return (
      <div style={{ padding: '20px', border: '1px solid lightgray', borderRadius: '8px', textAlign: 'center' }}>
        <h3>保存されたデッキはありません</h3>
        <p>まずは新しいデッキを構築しましょう！</p>
        {/* 新規デッキ作成フォームへの誘導は親コンポーネントで行う */}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid lightgray', borderRadius: '8px' }}>
      <h3>保存されたデッキ</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {decks.map((deck) => (
          <li
            key={deck.id}
            style={{
              border: `2px solid ${deck.id === selectedDeckId ? 'blue' : 'transparent'}`,
              padding: '10px',
              margin: '10px 0',
              borderRadius: '5px',
              backgroundColor: deck.id === selectedDeckId ? '#e6f7ff' : '#f9f9f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h4>{deck.name} ({deck.cards.length}枚)</h4>
              <p style={{ fontSize: '0.9em', color: '#555' }}>
                {Object.entries(deck.cards).map(([cardId, count]) => {
                  const cardTemplate = availableCardTemplates.find(t => t.templateId === cardId);
                  const cardName = cardTemplate ? cardTemplate.name : cardId;
                  return `${cardName} (${count}枚)`;
                }).join(', ')}
              </p>
            </div>
            <div>
              <button
                onClick={() => onSelectDeck(deck.id!)}
                style={{
                  marginRight: '10px',
                  padding: '8px 12px',
                  backgroundColor: deck.id === selectedDeckId ? '#0056b3' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {deck.id === selectedDeckId ? '選択中' : 'このデッキを選択'}
              </button>
              <button
                onClick={() => onEditDeck(deck)}
                style={{
                  marginRight: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                編集
              </button>
              <button
                onClick={() => onDeleteDeck(deck.id!)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SavedDecksList;
