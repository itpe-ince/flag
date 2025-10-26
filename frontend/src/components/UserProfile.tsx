import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserStats } from '../types';
import userService from '../services/user-service';
import './UserProfile.css';

interface UserProfileProps {
  onClose?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadUserStats = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const response = await userService.getUserStats(user.id);
        
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(response.error?.message || 'Failed to load user statistics');
        }
      } catch (err) {
        setError('Failed to load user statistics');
        console.error('Error loading user stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserStats();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    onClose?.();
  };

  if (!user) {
    return (
      <div className="user-profile-container">
        <div className="user-profile">
          <h2>Not Logged In</h2>
          <p>Please log in to view your profile.</p>
          {onClose && (
            <button className="close-button" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile">
        {onClose && (
          <button className="profile-close-button" onClick={onClose}>
            ×
          </button>
        )}
        
        <div className="profile-header">
          {user.avatarUrl && (
            <img 
              src={user.avatarUrl} 
              alt={`${user.username}'s avatar`}
              className="profile-avatar"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="profile-info">
            <h2>{user.username}</h2>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-stats">
            <p>Loading statistics...</p>
          </div>
        ) : error ? (
          <div className="error-stats">
            <p>{error}</p>
          </div>
        ) : stats ? (
          <div className="profile-stats">
            <h3>Game Statistics</h3>
            
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Games</span>
                <span className="stat-value">{formatNumber(stats.totalGames)}</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-label">Correct Answers</span>
                <span className="stat-value">{formatNumber(stats.totalCorrect)}</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-label">Best Streak</span>
                <span className="stat-value">{formatNumber(stats.bestStreak)}</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-label">Highest Level</span>
                <span className="stat-value">{formatNumber(stats.highestLevel)}</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-label">Total Score</span>
                <span className="stat-value">{formatNumber(stats.totalScore)}</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-label">Average Response Time</span>
                <span className="stat-value">
                  {stats.averageResponseTime > 0 
                    ? formatTime(stats.averageResponseTime) 
                    : 'N/A'
                  }
                </span>
              </div>
              
              {stats.accuracyPercentage !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Accuracy</span>
                  <span className="stat-value">{stats.accuracyPercentage.toFixed(1)}%</span>
                </div>
              )}
              
              {stats.completedGames !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Completed Games</span>
                  <span className="stat-value">{formatNumber(stats.completedGames)}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="profile-actions">
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;