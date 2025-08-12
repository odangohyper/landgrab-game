// packages/web-game-client/src/components/HandView.tsx

import React from 'react';
import { Card } from '../types'; // Adjust path if necessary

interface HandViewProps {
  hand: Card[];
  onCardSelect: (cardId: string) => void;
  playableCardIds: string[]; // IDs of cards that can be played
}

const HandView: React.FC<HandViewProps> = ({ hand, onCardSelect, playableCardIds }) => {
  // Ensure hand is always an array
  const currentHand = hand || [];

  return (
    <div style={{ display: 'flex', gap: '10px', padding: '20px', border: '1px solid gray' }}>
      <h3>Your Hand:</h3>
      {currentHand.length === 0 ? (
        <p>No cards in hand.</p>
      ) : (
        currentHand.map((card) => {
          const isPlayable = playableCardIds.includes(card.id);
          return (
            <div
              key={card.id}
              onClick={() => isPlayable && onCardSelect(card.id)}
              style={{
                border: '1px solid black',
                padding: '10px',
                width: '100px',
                height: '150px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'lightgray',
                cursor: isPlayable ? 'pointer' : 'not-allowed',
                opacity: isPlayable ? 1 : 0.5,
              }}
            >
              <p>{card.templateId}</p> {/* Display card type for now */}
              {/* Add more card details here */}
            </div>
          );
        })
      )}
    </div>
  );
};

export default HandView;
