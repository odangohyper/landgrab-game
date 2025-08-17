import React, { useState, useEffect, useCallback } from 'react';
import { Deck, CardTemplate } from '../types';
import { getDecks, createDeck, updateDeck, deleteDeck } from '../api/deckApi';
import { fetchCardTemplates } from '../api/realtimeClient';
import SavedDecksList from './SavedDecksList';
import DeckEditForm from './DeckEditForm';

interface DeckBuilderPageProps {
  onDeckSelect: (deckId: string) => void;
}

const DeckBuilderPage: React.FC<DeckBuilderPageProps> = ({ onDeckSelect }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [message, setMessage] = useState<string>('');
  const [availableCardTemplates, setAvailableCardTemplates] = useState<CardTemplate[]>([]);

  useEffect(() => {
    const loadCardTemplates = async () => {
      try {
        const fetchedTemplates = await fetchCardTemplates('v1');
        setAvailableCardTemplates(Object.values(fetchedTemplates));
      } catch (error) {
        console.error("Failed to fetch card templates:", error);
        setMessage("カードテンプレートの取得に失敗しました。");
      }
    };
    loadCardTemplates();
  }, []);

  const loadDecks = useCallback(async () => {
    try {
      const fetchedDecks = await getDecks();
      setDecks(fetchedDecks);
      if (!selectedDeckId && fetchedDecks.length > 0) {
        setSelectedDeckId(fetchedDecks[0].id!);
      }
    } catch (error: any) {
      console.error("Failed to fetch decks:", error);
      setMessage(`デッキの読み込みに失敗しました: ${error.message}`);
    }
  }, [selectedDeckId]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setMessage(`デッキ '${decks.find(d => d.id === deckId)?.name}' を選択しました！`);
  };

  const handleEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setMessage('');
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (window.confirm('本当にこのデッキを削除しますか？')) {
      try {
        await deleteDeck(deckId);
        setMessage('デッキを削除しました！');
        if (selectedDeckId === deckId) {
          setSelectedDeckId(null);
        }
        loadDecks();
      } catch (error: any) {
        console.error("Failed to delete deck:", error);
        setMessage(`デッキの削除に失敗しました: ${error.message}`);
      }
    }
  };

  const handleSaveOrUpdateDeck = async (deck: Deck) => {
    try {
      let savedDeck: Deck;
      if (deck.id) {
        savedDeck = await updateDeck(deck);
        setMessage(`デッキ '${savedDeck.name}' を更新しました！`);
      } else {
        savedDeck = await createDeck(deck);
        setMessage(`デッキ '${savedDeck.name}' を保存しました！`);
      }
      setEditingDeck(null);
      await loadDecks(); 
      setSelectedDeckId(savedDeck.id!); 
    } catch (error: any) {
      console.error("Failed to save/update deck:", error);
      setMessage(`デッキの保存/更新に失敗しました: ${error.message}`);
    }
  };

  const handleCreateNewDeck = () => {
    setEditingDeck({ id: undefined, name: '', cards: {} });
    setMessage('');
  };

  const handlePlayWithSelectedDeck = () => {
    if (selectedDeckId) {
      onDeckSelect(selectedDeckId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2>デッキ管理</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}

      {editingDeck ? (
        <DeckEditForm
          deck={editingDeck}
          availableCardTemplates={availableCardTemplates}
          onSave={handleSaveOrUpdateDeck}
          onCancel={() => setEditingDeck(null)}
        />
      ) : (
        <>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button onClick={handleCreateNewDeck} style={{ padding: '10px 20px', fontSize: '1.1em' }}>
              新しいデッキを作成
            </button>
            <button 
              onClick={handlePlayWithSelectedDeck} 
              disabled={!selectedDeckId}
              style={{ padding: '10px 20px', fontSize: '1.1em', backgroundColor: '#28a745', color: 'white' }}
            >
              選択したデッキで対戦
            </button>
          </div>
          <SavedDecksList
            decks={decks}
            selectedDeckId={selectedDeckId}
            onSelectDeck={handleSelectDeck}
            onEditDeck={handleEditDeck}
            onDeleteDeck={handleDeleteDeck}
            availableCardTemplates={availableCardTemplates}
          />
          {decks.length === 0 && (
            <div style={{ marginTop: '20px', padding: '15px', border: '1px dashed gray', textAlign: 'center' }}>
              <p>まだデッキがありません。上のボタンから新しいデッキを作成してください。</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeckBuilderPage;