// packages/web-game-client/src/components/HandView.tsx

import React from 'react';
import { CardInstance, CardTemplate, SelectedAction } from '../types';

interface HandViewProps {
  hand: CardInstance[];
  onActionSelect: (action: SelectedAction | null) => void;
  playableCardUuids: string[];
  cardTemplates: { [templateId: string]: CardTemplate };
  selectedAction: SelectedAction | null;
  playerId: string;
}

const HandView: React.FC<HandViewProps> = ({ hand, onActionSelect, playableCardUuids, cardTemplates, selectedAction, playerId }) => {
  const currentHand = hand || [];

  return (
    <div className="hand-container">
      {currentHand.length === 0 ? (
        <p className="no-cards-message">No cards in hand.</p>
      ) : (
        currentHand.map((card) => {
          const isPlayable = playableCardUuids.includes(card.uuid);
          const isSelected = selectedAction?.type === 'play_card' && selectedAction.cardUuid === card.uuid;
          const template = cardTemplates[card.templateId];
          const imageUrl = template ? `/images/cards/${template.templateId}.jpg` : '';

          const cardClasses = [
            'card-item',
            isPlayable ? 'playable' : 'disabled',
            isSelected ? 'selected' : '',
            isSelected ? 'no-hover' : '',
          ].join(' ').trim();

          return (
            <div
              key={card.uuid}
              className={cardClasses}
              title={template?.flavorText}
              onClick={() => {
                if (isSelected) {
                  onActionSelect(null);
                } else if (isPlayable) {
                  onActionSelect({ type: 'play_card', cardUuid: card.uuid });
                }
              }}
            >
              {imageUrl && <img src={imageUrl} alt={template?.name} className="card-image" />}
              <p className="card-name">{template ? `${template.name}：コスト${template.cost}` : card.templateId}</p>
            </div>
          );
        })
      )}
    </div>
  );
};

export default HandView;