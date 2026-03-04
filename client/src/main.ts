import './ui/styles/game-ui.css';
import { Game } from './Game.js';

const game = new Game();

window.addEventListener('game-login', async (e: Event) => {
  const detail = (e as CustomEvent).detail;
  const name = detail.name as string;

  // Hide login screen
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.style.display = 'none';

  // Get game container
  const container = document.getElementById('game-container');
  if (!container) {
    console.error('No game container found');
    return;
  }

  try {
    await game.init(container, name);
    (window as any).__game = game;
    console.log('[Main] Game initialized for player:', name);
  } catch (err) {
    console.error('[Main] Failed to initialize game:', err);
    // Show login screen again
    if (loginScreen) {
      loginScreen.style.display = 'flex';
      const loadingText = document.getElementById('loading-text');
      const playBtn = document.getElementById('play-btn');
      if (loadingText) loadingText.textContent = 'Error: ' + (err as Error).message;
      if (playBtn) playBtn.style.display = 'block';
    }
  }
});
