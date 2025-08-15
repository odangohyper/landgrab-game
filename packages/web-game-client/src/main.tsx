import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const BASE_WIDTH = 1400;
const BASE_HEIGHT = 900;

function resizeGame() {
  const gameRoot = document.getElementById('game-root');
  if (!gameRoot) return;

  const scaleX = window.innerWidth / BASE_WIDTH;
  const scaleY = window.innerHeight / BASE_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  // Apply scale and ensure it's centered
  gameRoot.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// Initial resize
resizeGame();

// Add event listener for window resize
window.addEventListener('resize', resizeGame);

createRoot(document.getElementById('root')!).render(
  <App />,
)