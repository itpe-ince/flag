import React, { useState } from 'react';
import { GameMode } from './GameModeSelector';
import GameModeSelector from './GameModeSelector';
import SinglePlayerGame from './SinglePlayerGame';
import TimeAttackGame from './TimeAttackGame';
import MultiplayerGame from './MultiplayerGame';

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