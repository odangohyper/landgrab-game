// packages/web-game-client/src/components/HandView.tsx

import React from 'react';
import { Card, CardTemplate } from '../types';

interface HandViewProps {
  hand: Card[];
  onCardSelect: (cardId: string) => void;
  playableCardIds: string[];
  cardTemplates: { [templateId: string]: CardTemplate };
  selectedCardId: string | null; // New prop for selected card
}

const HandView: React.FC<HandViewProps> = ({ hand, onCardSelect, playableCardIds, cardTemplates, selectedCardId }) => {
  const currentHand = hand || [];

  return (
    <div className="hand-container">
      <h3>Your Hand:</h3>
      {currentHand.length === 0 ? (
        <p className="no-cards-message">No cards in hand.</p>
      ) : (
        currentHand.map((card) => {
          const isPlayable = playableCardIds.includes(card.id);
          const isSelected = card.id === selectedCardId;
          const template = cardTemplates[card.templateId];
          const imageUrl = template ? `/images/cards/${template.templateId}.jpg` : '';

          const cardClasses = [
            'card-item',
            isPlayable ? 'playable' : 'disabled',
            isSelected ? 'selected' : '',
          ].join(' ').trim();

          return (
            <div
              key={card.id}
              className={cardClasses}
              onClick={() => isPlayable && onCardSelect(card.id)}
            >
              {imageUrl && <img src={imageUrl} alt={template?.name} className="card-image" />}
              <p className="card-name">{template?.name || card.templateId}</p>
            </div>
          );
        })
      )}
    </div>
  );
};

export default HandView;
