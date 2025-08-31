// packages/web-game-client/src/components/HandView.tsx

import React from 'react';
import { Card, CardTemplate, SelectedAction } from '../types';
import useLongPress from '../hooks/useLongPress';

interface HandViewProps {
  hand: Card[];
  onActionSelect: (action: SelectedAction | null) => void;
  playableCardUuids: string[];
  cardTemplates: { [templateId: string]: CardTemplate };
  selectedAction: SelectedAction | null;
  playerId: string;
  onShowCardDetails: (card: CardTemplate) => void;
}

const CardItem: React.FC<{ 
  card: Card;
  isPlayable: boolean;
  isSelected: boolean;
  template: CardTemplate;
  onActionSelect: (action: SelectedAction | null) => void;
  onShowCardDetails: (card: CardTemplate) => void;
}> = ({ card, isPlayable, isSelected, template, onActionSelect, onShowCardDetails }) => {
  
  const handleLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    // To prevent the context menu from appearing on some devices
    if ('preventDefault' in e) {
        e.preventDefault();
    }
    onShowCardDetails(template);
  };

  const handleClick = () => {
    if (isSelected) {
      onActionSelect(null);
    } else if (isPlayable) {
      onActionSelect({ type: 'play_card', cardUuid: card.uuid });
    }
  };

  const longPressEvents = useLongPress(handleLongPress, handleClick, { delay: 500 });

  const cardClasses = [
    'card-item',
    isPlayable ? 'playable' : 'disabled',
    isSelected ? 'selected' : '',
    isSelected ? 'no-hover' : '',
  ].join(' ').trim();

  const imageUrl = template ? `/images/cards/${template.templateId}.jpg` : '';

  return (
    <div
      key={card.uuid}
      className={cardClasses}
      title={template?.flavorText}
      onContextMenu={(e) => {
        e.preventDefault();
        onShowCardDetails(template);
      }}
      {...longPressEvents}
    >
      {imageUrl && <img src={imageUrl} alt={template?.name} className="card-image" />}
      <p className="card-name">{template ? `${template.name}：コスト${template.cost}` : card.templateId}</p>
    </div>
  );
};


const HandView: React.FC<HandViewProps> = ({ hand, onActionSelect, playableCardUuids, cardTemplates, selectedAction, playerId, onShowCardDetails }) => {
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

          if (!template) return null;

          return (
            <CardItem
              key={card.uuid}
              card={card}
              isPlayable={isPlayable}
              isSelected={isSelected}
              template={template}
              onActionSelect={onActionSelect}
              onShowCardDetails={onShowCardDetails}
            />
          );
        })
      )}
    </div>
  );
};

export default HandView;