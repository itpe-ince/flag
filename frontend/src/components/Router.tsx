import React, { useState } from 'react';
import { GameMode } from './GameModeSelector';
import GameModeSelector from './GameModeSelector';
import SinglePlayerGame from './SinglePlayerGame';

// Placeholder components for other game modes
const TimeAttackGame: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Time Attack Mode</h2>
    <p>Time attack game will be implemented in future tasks.</p>
    <button onClick={onBack} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
      Back to Menu
    </button>
  </div>
);

const MultiplayerGame: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Multiplayer Mode</h2>
    <p>Multiplayer game will be implemented in future tasks.</p>
    <button onClick={onBack} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
      Back to Menu
    </button>
  </div>
);

type Route = 'menu' | 'single' | 'timeattack' | 'multiplayer';

const Router: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<Route>('menu');

  const handleModeSelect = (mode: GameMode) => {
    setCurrentRoute(mode);
  };

  const handleBackToMenu = () => {
    setCurrentRoute('menu');
  };

  const renderCurrentRoute = () => {
    switch (currentRoute) {
      case 'menu':
        return <GameModeSelector onModeSelect={handleModeSelect} />;
      case 'single':
        return <SinglePlayerGame onBack={handleBackToMenu} />;
      case 'timeattack':
        return <TimeAttackGame onBack={handleBackToMenu} />;
      case 'multiplayer':
        return <MultiplayerGame onBack={handleBackToMenu} />;
      default:
        return <GameModeSelector onModeSelect={handleModeSelect} />;
    }
  };

  return (
    <div className="app-router">
      {renderCurrentRoute()}
    </div>
  );
};

export default Router;