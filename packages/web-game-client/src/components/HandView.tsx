// packages/web-game-client/src/components/HandView.tsx

import React from 'react';
import { Card } from '../types'; // Adjust path if necessary

interface HandViewProps {
  hand: Card[];
  // onCardSelect?: (cardId: string) => void; // For future card selection
  // playableCards?: string[]; // For future disabled state
}

const HandView: React.FC<HandViewProps> = ({ hand }) => {
  return (
    <div style={{ display: 'flex', gap: '10px', padding: '20px', border: '1px solid gray' }}>
      <h3>Your Hand:</h3>
      {hand.length === 0 ? (
        <p>No cards in hand.</p>
      ) : (
        hand.map((card) => (
          <div
            key={card.id}
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
            }}
          >
            <p>{card.templateId}</p> {/* Display card type for now */}
            {/* Add more card details here */}
          </div>
        ))
      )}
    </div>
  );
};

export default HandView;
