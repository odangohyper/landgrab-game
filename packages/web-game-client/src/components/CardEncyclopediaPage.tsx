import React, { useState, useEffect } from 'react';
import { CardTemplate } from '../types';
import Modal from './Modal';
import styles from './CardEncyclopediaPage.module.css';

const CardEncyclopediaPage: React.FC = () => {
  const [cards, setCards] = useState<CardTemplate[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchCardData = async () => {
      try {
        // 1. Fetch the manifest file
        const manifestResponse = await fetch('/cards/_manifest.json');
        if (!manifestResponse.ok) {
          throw new Error('Failed to fetch card manifest');
        }
        const manifest = await manifestResponse.json();
        const cardNames: string[] = manifest.card_names;

        // 2. Fetch all card templates in parallel
        const cardPromises = cardNames.map(name =>
          fetch(`/cards/${name}.json`).then(res => {
            if (!res.ok) {
              console.error(`Failed to fetch card: ${name}`);
              return null;
            }
            return res.json();
          })
        );

        const loadedCards = (await Promise.all(cardPromises)).filter(
          (card): card is CardTemplate => card !== null
        );
        
        // Sort cards by serialId
        loadedCards.sort((a, b) => a.serialId.localeCompare(b.serialId));

        setCards(loadedCards);
      } catch (error) {
        console.error("Error loading card data:", error);
      }
    };

    fetchCardData();
  }, []);

  const handleCardClick = (card: CardTemplate) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  return (
    <div className={styles.encyclopediaContainer}>
      <h1 className={styles.title}>カード図鑑</h1>
      <div className={styles.cardGrid}>
        {cards.map(card => (
          <div key={card.templateId} className={styles.cardItem} onClick={() => handleCardClick(card)}>
            <img src={card.illustPath} alt={card.name} className={styles.cardImage} />
            <p className={styles.cardName}>{card.name}</p>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedCard?.name ?? 'カード詳細'}>
        {selectedCard && (
          <div className={styles.modalContent}>
            <img src={selectedCard.illustPath} alt={selectedCard.name} className={styles.modalCardImage} />
            <div className={styles.modalDetails}>
              <p><strong>コスト:</strong> {selectedCard.cost}</p>
              <p><strong>カテゴリ:</strong> {selectedCard.effect.category}</p>
              <p><strong>シリアルID:</strong> {selectedCard.serialId}</p>
              <hr />
              <p className={styles.flavorText}><em>{selectedCard.flavorText}</em></p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CardEncyclopediaPage;