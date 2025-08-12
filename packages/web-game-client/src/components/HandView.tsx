// packages/web-game-client/src/components/HandView.tsx

import React from 'react';
import { Card, CardTemplate } from '../types'; // Adjust path if necessary

interface HandViewProps {
  hand: Card[];
  onCardSelect: (cardId: string) => void;
  playableCardIds: string[]; // IDs of cards that can be played
  cardTemplates: { [templateId: string]: CardTemplate }; // Map of all available card templates
}

const HandView: React.FC<HandViewProps> = ({ hand, onCardSelect, playableCardIds, cardTemplates }) => {
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
          const template = cardTemplates[card.templateId];
          const imageUrl = template ? `/images/cards/${template.templateId}.jpg` : ''; // Assuming .jpg

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
                position: 'relative', // For image positioning
              }}
            >
              {imageUrl && <img src={imageUrl} alt={template?.name} style={{ width: '100%', height: 'auto', flexGrow: 1 }} />}
              <p style={{ fontSize: '0.8em', textAlign: 'center', marginTop: '5px' }}>{template?.name || card.templateId}</p>
              {/* Add more card details here */}
            </div>
          );
        })
      )}
    </div>
  );
};

export default HandView;
