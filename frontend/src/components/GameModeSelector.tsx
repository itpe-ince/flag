import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import UserProfile from './UserProfile';
import './GameModeSelector.css';

export type GameMode = 'single' | 'timeattack' | 'multiplayer';

interface GameModeOption {
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  features: string[];
}

interface GameModeSelectorProps {
  onModeSelect: (mode: GameMode) => void;
  disabled?: boolean;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  onModeSelect,
  disabled = false
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showProfile, setShowProfile] = useState(false);
  const gameModes: GameModeOption[] = [
    {
      id: 'single',
      title: 'Single Player',
      description: 'Progressive difficulty with level-based scoring',
      icon: '🎯',
      features: [
        'Start with 2 choices, double each level',
        'Game ends on wrong answer',
        'Level multiplier scoring',
        'Personal best tracking'
      ]
    },
    {
      id: 'timeattack',
      title: 'Time Attack',
      description: '60-second challenge with leaderboards',
      icon: '⏱️',
      features: [
        '60-second time limit',
        'Continuous questions',
        'Time bonus scoring',
        'Daily/weekly rankings'
      ]
    },
    {
      id: 'multiplayer',
      title: 'Multiplayer',
      description: 'Real-time competition with friends',
      icon: '👥',
      features: [
        'Create or join rooms',
        'Real-time competition',
        'Simultaneous questions',
        'Winner takes all'
      ]
    }
  ];

  const handleModeSelect = (mode: GameMode) => {
    if (!disabled) {
      onModeSelect(mode);
    }
  };

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleRegister = () => {
    setAuthMode('register');
    setShowAuthModal(true);
  };

  const handleProfile = () => {
    setShowProfile(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="game-mode-selector">
      <div className="selector-header">
        <h1>Flag Guessing Game</h1>
        <p>Choose your game mode and test your flag knowledge!</p>
        
        <div className="auth-section">
          {isAuthenticated && user ? (
            <div className="user-info">
              <span className="welcome-text">Welcome, {user.username}!</span>
              <div className="user-actions">
                <button className="profile-button" onClick={handleProfile}>
                  Profile
                </button>
                <button className="logout-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="guest-info">
              <span className="guest-text">Playing as Guest</span>
              <div className="auth-actions">
                <button className="login-button" onClick={handleLogin}>
                  Login
                </button>
                <button className="register-button" onClick={handleRegister}>
                  Register
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mode-grid">
        {gameModes.map((mode) => (
          <div
            key={mode.id}
            className={`mode-card ${disabled ? 'disabled' : ''}`}
            onClick={() => handleModeSelect(mode.id)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleModeSelect(mode.id);
              }
            }}
          >
            <div className="mode-icon">
              {mode.icon}
            </div>
            
            <div className="mode-content">
              <h3 className="mode-title">{mode.title}</h3>
              <p className="mode-description">{mode.description}</p>
              
              <ul className="mode-features">
                {mode.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            
            <div className="mode-action">
              <span className="play-button">Play Now</span>
            </div>
          </div>
        ))}
      </div>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
      
      {showProfile && (
        <div className="profile-modal-overlay">
          <UserProfile onClose={() => setShowProfile(false)} />
        </div>
      )}
    </div>
  );
};

export default GameModeSelector;