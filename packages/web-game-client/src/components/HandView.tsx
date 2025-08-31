// packages/web-game-client/src/components/HandView.tsx

import React from 'react';
import { Card, CardTemplate, SelectedAction } from '../types';

interface HandViewProps {
  hand: Card[];
  onActionSelect: (action: SelectedAction | null) => void;
  playableCardUuids: string[];
  cardTemplates: { [templateId: string]: CardTemplate };
  selectedAction: SelectedAction | null;
  playerId: string;
  onShowCardDetails: (card: CardTemplate) => void;
}

const HandView: React.FC<HandViewProps> = ({ hand, onActionSelect, playableCardUuids, cardTemplates, selectedAction, playerId, onShowCardDetails }) => {
  const currentHand = hand || [];

  const handleContextMenu = (e: React.MouseEvent, card: CardTemplate) => {
    e.preventDefault();
    onShowCardDetails(card);
  };

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

          if (!template) return null; // templateがない場合は何も描画しない

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
              onContextMenu={(e) => handleContextMenu(e, template)}
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