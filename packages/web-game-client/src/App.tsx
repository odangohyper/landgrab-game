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
      <nav style={{ marginBottom: '20px' }}>
        <button onClick={() => setCurrentView('game')} style={{ marginRight: '10px' }}>Game</button>
        <button onClick={() => setCurrentView('deckBuilder')}>Deck Builder</button>
      </nav>
      {renderView()}
    </div>
  );
}

export default App;