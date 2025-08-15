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
        <button onClick={() => setCurrentView('game')}>Game</button>
        <button onClick={() => setCurrentView('deckBuilder')}>Deck Builder</button>
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