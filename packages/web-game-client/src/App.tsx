import React, { useState } from 'react';
import GameView from './components/GameView';
import DeckBuilderPage from './components/DeckBuilderPage';
import useLocalStorage from './hooks/useLocalStorage'; // Import the hook
import './App.css';

type View = 'game' | 'deckBuilder';

function App() {
  const [currentView, setCurrentView] = useState<'game' | 'deckBuilder'>('game');
  const [selectedDeckId, setSelectedDeckId] = useLocalStorage<string | null>('selectedDeckId', null);

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
        <button disabled>チュートリアル</button>
        <button disabled>プロローグ</button>
        <button disabled>クレジット</button>
      </div>
      <div className="game-panel">
        <div className={`view-container ${currentView === 'game' ? 'active' : ''}`}>
          <GameView selectedDeckId={selectedDeckId} />
        </div>
        <div className={`view-container ${currentView === 'deckBuilder' ? 'active' : ''}`}>
          <DeckBuilderPage onDeckSelect={handleDeckSelected} />
        </div>
      </div>
    </div>
  );
}

export default App;