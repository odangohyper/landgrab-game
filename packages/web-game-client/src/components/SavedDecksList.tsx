import React from 'react';
import { Deck, CardTemplate } from '../types';
import useLongPress from '../hooks/useLongPress';

interface SavedDecksListProps {
  userDecks: Deck[];
  recommendedDecks: Deck[];
  selectedDeckId: string | null;
  onSelectDeck: (deckId: string) => void;
  onEditDeck: (deck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  availableCardTemplates: CardTemplate[];
  onShowCardDetails: (card: CardTemplate) => void;
}

const DeckCardEntry: React.FC<{ 
  cardTemplate: CardTemplate;
  count: number;
  onShowCardDetails: (card: CardTemplate) => void;
}> = ({ cardTemplate, count, onShowCardDetails }) => {
  
  const handleLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    if ('preventDefault' in e) {
        e.preventDefault();
    }
    onShowCardDetails(cardTemplate);
  };

  const handleClick = () => {}; // Regular click on the text does nothing

  const longPressEvents = useLongPress(handleLongPress, handleClick, { delay: 500 });

  return (
    <span 
      onContextMenu={(e) => {
        e.preventDefault();
        onShowCardDetails(cardTemplate);
      }}
      style={{ cursor: 'context-menu', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
      {...longPressEvents}
    >
      {`${cardTemplate.name} (x${count})`}
    </span>
  );
};


const DeckCard = ({ deck, selected, onSelect, onEdit, onDelete, cardTemplates, isRecommended = false, onShowCardDetails }: any) => {
  const totalCards = Object.values(deck.cards).reduce((sum: any, count: any) => sum + count, 0);

  return (
    <li
      style={{
        border: `2px solid ${selected ? 'blue' : 'transparent'}`,
        padding: '15px',
        margin: '10px 0',
        borderRadius: '8px',
        backgroundColor: selected ? '#e6f7ff' : '#f9f9f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{deck.name} ({totalCards}枚)</h4>
        <p style={{ fontSize: '0.9em', color: '#555', margin: 0 }}>
          {Object.entries(deck.cards).map(([cardId, count], index, arr) => {
            const cardTemplate = cardTemplates.find((t: any) => t.templateId === cardId);
            if (!cardTemplate) {
              return null;
            }
            return (
              <React.Fragment key={cardId}>
                <DeckCardEntry
                  cardTemplate={cardTemplate}
                  count={count as number}
                  onShowCardDetails={onShowCardDetails}
                />
                {index < arr.length - 1 ? ', ' : ''}
              </React.Fragment>
            );
          })}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => onSelect(deck.id!)}
          style={{
            padding: '8px 16px',
            backgroundColor: selected ? '#0056b3' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {selected ? '選択中' : 'このデッキを選択'}
        </button>
        {!isRecommended && (
          <>
            <button
              onClick={() => onEdit(deck)}
              style={{
                padding: '8px 16px',
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
              onClick={() => onDelete(deck.id!)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              削除
            </button>
          </>
        )}
      </div>
    </li>
  );
};

const SavedDecksList: React.FC<SavedDecksListProps> = ({
  userDecks,
  recommendedDecks,
  selectedDeckId,
  onSelectDeck,
  onEditDeck,
  onDeleteDeck,
  availableCardTemplates,
  onShowCardDetails,
}) => {
  if (userDecks.length === 0 && recommendedDecks.length === 0) {
    return null; // Let parent component handle this case
  }

  return (
    <div style={{ width: '100%' }}>
      {userDecks.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ borderBottom: '2px solid #28a745', paddingBottom: '10px', color: '#28a745' }}>マイデッキ</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {userDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                selected={deck.id === selectedDeckId}
                onSelect={onSelectDeck}
                onEdit={onEditDeck}
                onDelete={onDeleteDeck}
                cardTemplates={availableCardTemplates}
                isRecommended={false}
                onShowCardDetails={onShowCardDetails}
              />
            ))}
          </ul>
        </div>
      )}

      {recommendedDecks.length > 0 && (
        <div>
          <h3 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px', color: '#007bff' }}>テンプレートデッキ</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {recommendedDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                selected={deck.id === selectedDeckId}
                onSelect={onSelectDeck}
                cardTemplates={availableCardTemplates}
                isRecommended={true}
                onShowCardDetails={onShowCardDetails}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SavedDecksList;
