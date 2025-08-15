import React, { useState, useEffect } from 'react';
import { CardTemplate, Deck } from '../types';
import { fetchCardTemplates } from '../api/realtimeClient';
import { createDeck, getDeck, updateDeck } from '../api/deckApi';

interface DeckBuilderProps {
  // Props will be added later, e.g., currentDeck
}

const DeckBuilder: React.FC<DeckBuilderProps> = () => {
  const [availableCardTemplates, setAvailableCardTemplates] = useState<{ [templateId: string]: CardTemplate }>({});
  const [currentDeck, setCurrentDeck] = useState<CardTemplate[]>([]);
  const [deckName, setDeckName] = useState<string>('');
  const [deckId, setDeckId] = useState<string>(''); // For loading/updating specific decks
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const loadCardTemplates = async () => {
      try {
        const fetchedTemplates = await fetchCardTemplates('v1');
        setAvailableCardTemplates(fetchedTemplates);
      } catch (error) {
        console.error("Failed to fetch card templates:", error);
        setMessage("カードテンプレートの取得に失敗しました。");
      }
    };
    loadCardTemplates();
  }, []);

  const handleAddCardToDeck = (cardTemplate: CardTemplate) => {
    if (currentDeck.length < 10) {
      setCurrentDeck([...currentDeck, cardTemplate]);
    } else {
      setMessage('デッキは10枚までです！');
    }
  };

  const handleRemoveCardFromDeck = (index: number) => {
    const newDeck = [...currentDeck];
    newDeck.splice(index, 1);
    setCurrentDeck(newDeck);
  };

  const handleSaveDeck = async () => {
    if (!deckName.trim()) {
      setMessage("デッキ名を入力してください。");
      return;
    }
    if (currentDeck.length === 0) {
      setMessage("デッキにカードがありません。");
      return;
    }

    setIsSaving(true);
    setMessage('');
    try {
      const deckToSave: Deck = {
        id: deckId || undefined, // Use existing ID if present, otherwise let backend generate
        name: deckName,
        cards: currentDeck,
      };
      
      let savedDeck: Deck;
      if (deckId) {
        savedDeck = await updateDeck(deckToSave);
        setMessage(`デッキ '${savedDeck.name}' を更新しました！`);
      } else {
        savedDeck = await createDeck(deckToSave);
        setDeckId(savedDeck.id || ''); // Set the ID received from backend
        setMessage(`デッキ '${savedDeck.name}' を保存しました！`);
      }
    } catch (error: any) {
      console.error("Failed to save deck:", error);
      setMessage(`デッキの保存に失敗しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDeck = async () => {
    if (!deckId.trim()) {
      setMessage("読み込むデッキのIDを入力してください。");
      return;
    }

    setIsLoading(true);
    setMessage('');
    try {
      const loadedDeck = await getDeck(deckId);
      setDeckName(loadedDeck.name);
      setCurrentDeck(loadedDeck.cards);
      setMessage(`デッキ '${loadedDeck.name}' を読み込みました！`);
    } catch (error: any) {
      console.error("Failed to load deck:", error);
      setMessage(`デッキの読み込みに失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2>デッキ構築</h2>
      {message && <p style={{ color: 'red' }}>{message}</p>}

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="デッキ名"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <button onClick={handleSaveDeck} disabled={isSaving}>
          {isSaving ? '保存中...' : 'デッキを保存'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="読み込むデッキID"
          value={deckId}
          onChange={(e) => setDeckId(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <button onClick={handleLoadDeck} disabled={isLoading}>
          {isLoading ? '読み込み中...' : 'デッキを読み込む'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
        <div style={{ border: '1px solid lightgray', padding: '10px', width: '45%' }}>
          <h3>利用可能なカード</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Object.values(availableCardTemplates).map((card) => {
              const imageUrl = `/images/cards/${card.templateId}.jpg`;
              return (
                <div key={card.templateId} style={{ border: '1px solid gray', margin: '5px', padding: '5px', display: 'flex', alignItems: 'center' }}>
                  {imageUrl && <img src={imageUrl} alt={card.name} style={{ width: '50px', height: 'auto', marginRight: '10px' }} />}
                  <div>
                    <h4>{card.name} (コスト: {card.cost})</h4>
                    <p style={{ fontSize: '0.8em' }}>{card.description}</p>
                    <button onClick={() => handleAddCardToDeck(card)}>デッキに追加</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ border: '1px solid lightgray', padding: '10px', width: '45%' }}>
          <h3>現在のデッキ ({currentDeck.length}/10)</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {currentDeck.length === 0 ? (
              <p>デッキにカードがありません。</p>
            ) : (
              currentDeck.map((card, index) => {
                const imageUrl = `/images/cards/${card.templateId}.jpg`;
                return (
                  <div key={index} style={{ border: '1px solid gray', margin: '5px', padding: '5px', display: 'flex', alignItems: 'center' }}>
                    {imageUrl && <img src={imageUrl} alt={card.name} style={{ width: '50px', height: 'auto', marginRight: '10px' }} />}
                    <div>
                      <h4>{card.name}</h4>
                      <button onClick={() => handleRemoveCardFromDeck(index)}>デッキから削除</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;