import React from 'react';
import { Card, CardTemplate } from '../types';
import './DeckInfo.css';

interface DeckInfoProps {
  cards: Card[];
  cardTemplates: { [key: string]: CardTemplate };
  isDeck: boolean; // To know if we should hide the order
}

const DeckInfo: React.FC<DeckInfoProps> = ({ cards, cardTemplates, isDeck }) => {
  if (isDeck) {
    // For the deck, we just show the count and the list of cards without order.
    const cardCounts = cards.reduce((acc, card) => {
      const template = cardTemplates[card.templateId];
      const name = template ? template.name : card.templateId;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return (
      <div className="deck-info-container modal-view">
        <p>残り枚数: {cards.length}</p>
        <ul className="card-list">
          {Object.entries(cardCounts).map(([name, count]) => (
            <li key={name}>{name} x{count}</li>
          ))}
        </ul>
      </div>
    );
  }

  // For the discard pile, we show the cards in order.
  return (
    <div className="deck-info-container modal-view">
      {cards.length === 0 ? (
        <p>捨札はありません。</p>
      ) : (
        <ul className="card-list">
          {cards.map((card, index) => {
            const template = cardTemplates[card.templateId];
            return (
              <li key={index}>
                {template ? template.name : card.templateId}
              </li>
            );
          }).reverse() /* Show most recent first */}
        </ul>
      )}
    </div>
  );
};

export default DeckInfo;