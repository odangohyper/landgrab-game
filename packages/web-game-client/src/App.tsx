import React, { useState } from 'react';
import GameView from './components/GameView';
import DeckBuilder from './components/DeckBuilder';
import './App.css';

type View = 'game' | 'deckBuilder';

function App() {
  console.log('App component rendered.');
  const [currentView, setCurrentView] = useState<View>('game'); // Default to game view

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
          <GameView />
        </div>
        <div className={`view-container ${currentView === 'deckBuilder' ? 'active' : ''}`}>
          <DeckBuilder />
        </div>
      </div>
    </div>
  );
}

export default App;