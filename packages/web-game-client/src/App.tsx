import React, { useState } from 'react';
import GameView from './components/GameView';
import DeckBuilder from './components/DeckBuilder';
import './App.css';

type View = 'game' | 'deckBuilder';

function App() {
  const [currentView, setCurrentView] = useState<View>('game'); // Default to game view

  const renderView = () => {
    switch (currentView) {
      case 'game':
        return <GameView />;
      case 'deckBuilder':
        return <DeckBuilder />;
      default:
        return <GameView />;
    }
  };

  return (
    <div className="App">
      <div className="nav-panel">
        <button onClick={() => setCurrentView('game')}>Game</button>
        <button onClick={() => setCurrentView('deckBuilder')}>Deck Builder</button>
      </div>
      <div className="game-panel">
        {renderView()}
      </div>
    </div>
  );
}

export default App;