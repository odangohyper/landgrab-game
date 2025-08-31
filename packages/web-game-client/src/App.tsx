import React, { useState, useCallback } from 'react';
import GameView from './components/GameView';
import DeckBuilderPage from './components/DeckBuilderPage';
import CardEncyclopediaPage from './components/CardEncyclopediaPage';
import Modal from './components/Modal'; // 追加
import useLocalStorage from './hooks/useLocalStorage';
import { CardTemplate } from './types'; // 追加
import './App.css';
// 追加: モーダル用のスタイルをインポート
import styles from './components/CardEncyclopediaPage.module.css'; 

type View = 'game' | 'deckBuilder' | 'encyclopedia';

function App() {
  const [currentView, setCurrentView] = useState<View>('game');
  const [selectedDeckId, setSelectedDeckId] = useLocalStorage<string | null>('selectedDeckId', null);

  // --- Context Menu Modal State ---
  const [contextMenuCard, setContextMenuCard] = useState<CardTemplate | null>(null);
  const [isContextMenuModalOpen, setIsContextMenuModalOpen] = useState(false);

  const handleShowCardDetails = useCallback((card: CardTemplate) => {
    setContextMenuCard(card);
    setIsContextMenuModalOpen(true);
  }, []);

  const handleCloseContextMenuModal = useCallback(() => {
    setIsContextMenuModalOpen(false);
    setContextMenuCard(null);
  }, []);
  // --- End Context Menu Modal State ---

  const handleDeckSelected = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentView('game');
  };

  return (
    <div className="App">
      <div className="nav-panel">
        <button 
          className={currentView === 'game' ? 'active' : ''}
          onClick={() => setCurrentView('game')}
        >
          対戦！
        </button>
        <button 
          className={currentView === 'deckBuilder' ? 'active' : ''}
          onClick={() => setCurrentView('deckBuilder')}
        >
          デッキ構築
        </button>
        <button 
          className={currentView === 'encyclopedia' ? 'active' : ''}
          onClick={() => setCurrentView('encyclopedia')}
        >
          カード図鑑
        </button>
        <button disabled>チュートリアル</button>
        <button disabled>プロローグ</button>
        <button disabled>クレジット</button>
        <div style={{ marginTop: 'auto', fontSize: '0.75rem', color: '#888' }}>
          v{__APP_VERSION__}
        </div>
      </div>
      <div className="game-panel">
        <div className={`view-container ${currentView === 'game' ? 'active' : ''}`}>
          <GameView 
            selectedDeckId={selectedDeckId} 
            onShowCardDetails={handleShowCardDetails} 
          />
        </div>
        <div className={`view-container ${currentView === 'deckBuilder' ? 'active' : ''}`}>
          <DeckBuilderPage 
            onDeckSelect={handleDeckSelected} 
            onShowCardDetails={handleShowCardDetails} 
          />
        </div>
        <div className={`view-container ${currentView === 'encyclopedia' ? 'active' : ''}`}>
          <CardEncyclopediaPage />
        </div>
      </div>

      {/* Context Menu Modal */}
      <Modal 
        isOpen={isContextMenuModalOpen} 
        onClose={handleCloseContextMenuModal} 
        title={contextMenuCard?.name ?? 'カード詳細'}
      >
        {contextMenuCard && (
          <div className={styles.modalContent}>
            <img src={contextMenuCard.illustPath} alt={contextMenuCard.name} className={styles.modalCardImage} />
            <div className={styles.modalDetails}>
              <p><strong>コスト:</strong> {contextMenuCard.cost}</p>
              <p><strong>カテゴリ:</strong> {contextMenuCard.effect.category}</p>
              <p><strong>シリアルID:</strong> {contextMenuCard.serialId}</p>
              <hr />
              <p className={styles.flavorText}><em>{contextMenuCard.flavorText}</em></p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;