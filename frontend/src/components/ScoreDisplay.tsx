import React from 'react';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: number;
  level?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  streak?: number;
  multiplier?: number;
  showLevel?: boolean;
  showStreak?: boolean;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  level,
  correctAnswers,
  totalQuestions,
  streak,
  multiplier,
  showLevel = false,
  showStreak = false
}) => {
  const formatScore = (score: number): string => {
    return score.toLocaleString();
  };

  const getAccuracy = (): number => {
    if (!correctAnswers || !totalQuestions || totalQuestions === 0) {
      return 0;
    }
    return Math.round((correctAnswers / totalQuestions) * 100);
  };

  return (
    <div className="score-display">
      <div className="score-main">
        <div className="score-value">
          <span className="score-number">{formatScore(score)}</span>
          <span className="score-label">Score</span>
        </div>
        
        {multiplier && multiplier > 1 && (
          <div className="multiplier">
            <span className="multiplier-value">×{multiplier}</span>
            <span className="multiplier-label">Multiplier</span>
          </div>
        )}
      </div>
      
      <div className="score-details">
        {showLevel && level && (
          <div className="score-stat">
            <span className="stat-value">{level}</span>
            <span className="stat-label">Level</span>
          </div>
        )}
        
        {correctAnswers !== undefined && totalQuestions !== undefined && (
          <div className="score-stat">
            <span className="stat-value">{correctAnswers}/{totalQuestions}</span>
            <span className="stat-label">Correct</span>
          </div>
        )}
        
        {correctAnswers !== undefined && totalQuestions !== undefined && totalQuestions > 0 && (
          <div className="score-stat">
            <span className="stat-value">{getAccuracy()}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
        )}
        
        {showStreak && streak !== undefined && streak > 0 && (
          <div className="score-stat streak">
            <span className="stat-value">{streak}</span>
            <span className="stat-label">Streak</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreDisplay;