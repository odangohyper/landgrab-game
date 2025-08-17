import React, { useState, useEffect, useCallback } from 'react';
import { Deck, CardTemplate } from '../types';
import { getDecks, createDeck, updateDeck, deleteDeck, getDeck } from '../api/deckApi';
import { fetchCardTemplates } from '../api/realtimeClient';
import SavedDecksList from './SavedDecksList';
import DeckEditForm from './DeckEditForm'; // Renamed from DeckBuilder

const DECK_ID_STORAGE_KEY = 'selectedDeckId';

const DeckBuilderPage: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(() => {
    return localStorage.getItem(DECK_ID_STORAGE_KEY);
  });
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null); // null for new deck, Deck object for editing
  const [message, setMessage] = useState<string>('');
  const [availableCardTemplates, setAvailableCardTemplates] = useState<CardTemplate[]>([]);

  // Load available card templates
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

  // Load user's decks
  const loadDecks = useCallback(async () => {
    try {
      const fetchedDecks = await getDecks();
      setDecks(fetchedDecks);
      // If no deck is selected, and there are decks, select the first one
      if (!selectedDeckId && fetchedDecks.length > 0) {
        setSelectedDeckId(fetchedDecks[0].id!); // Use non-null assertion as we just checked length > 0
        localStorage.setItem(DECK_ID_STORAGE_KEY, fetchedDecks[0].id!); // Use non-null assertion
      }
    } catch (error: any) {
      console.error("Failed to fetch decks:", error);
      setMessage(`デッキの読み込みに失敗しました: ${error.message}`);
    }
  }, [selectedDeckId]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Handle deck selection
  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    localStorage.setItem(DECK_ID_STORAGE_KEY, deckId);
    setMessage(`デッキ '${decks.find(d => d.id === deckId)?.name}' を選択しました！`);
  };

  // Handle deck editing
  const handleEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setMessage('');
  };

  // Handle deck deletion
  const handleDeleteDeck = async (deckId: string) => {
    if (window.confirm('本当にこのデッキを削除しますか？')) {
      try {
        await deleteDeck(deckId);
        setMessage('デッキを削除しました！');
        loadDecks(); // Reload decks after deletion
        if (selectedDeckId === deckId) {
          setSelectedDeckId(null); // Clear selection if deleted deck was selected
          localStorage.removeItem(DECK_ID_STORAGE_KEY);
        }
      } catch (error: any) {
        console.error("Failed to delete deck:", error);
        setMessage(`デッキの削除に失敗しました: ${error.message}`);
      }
    }
  };

  // Handle saving/updating deck from DeckEditForm
  const handleSaveOrUpdateDeck = async (deck: Deck) => {
    console.log('handleSaveOrUpdateDeck called with:', deck); // ADDED LOG
    try {
      let savedDeck: Deck;
      if (deck.id) {
        savedDeck = await updateDeck(deck);
        setMessage(`デッキ '${savedDeck.name}' を更新しました！`);
        console.log('Deck updated:', savedDeck); // ADDED LOG
      } else {
        savedDeck = await createDeck(deck);
        setMessage(`デッキ '${savedDeck.name}' を保存しました！`);
        console.log('Deck created:', savedDeck); // ADDED LOG
      }
      setEditingDeck(null); // Exit editing mode
      loadDecks(); // Reload decks after save/update
      // If it's a new deck or updated selected deck, select it
      if (!selectedDeckId || selectedDeckId === deck.id) {
        setSelectedDeckId(savedDeck.id!); // Use non-null assertion
        localStorage.setItem(DECK_ID_STORAGE_KEY, savedDeck.id!); // Use non-null assertion
        console.log('Setting selectedDeckId in localStorage:', savedDeck.id); // ADDED LOG
      }
    } catch (error: any) {
      console.error("Failed to save/update deck:", error); // ALREADY EXISTS, BUT GOOD TO CONFIRM
      setMessage(`デッキの保存/更新に失敗しました: ${error.message}`);
      console.log('Error saving/updating deck:', error); // ADDED LOG
    }
  };

  // Handle creating a new deck
  const handleCreateNewDeck = () => {
    setEditingDeck({ id: undefined, name: '', cards: {} });
    setMessage('');
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
          <div style={{ marginBottom: '20px' }}>
            <button onClick={handleCreateNewDeck} style={{ padding: '10px 20px', fontSize: '1.1em' }}>
              新しいデッキを作成
            </button>
          </div>
          <SavedDecksList
            decks={decks}
            selectedDeckId={selectedDeckId}
            onSelectDeck={handleSelectDeck}
            onEditDeck={handleEditDeck}
            onDeleteDeck={handleDeleteDeck}
            availableCardTemplates={availableCardTemplates} // ADDED PROP
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
