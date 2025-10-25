import React, { useEffect, useState } from 'react';
import { AnswerResult, Country } from '../types';
import './ResultFeedback.css';

interface ResultFeedbackProps {
  result: AnswerResult | null;
  selectedAnswer?: Country;
  onAnimationComplete?: () => void;
  duration?: number;
}

const ResultFeedback: React.FC<ResultFeedbackProps> = ({
  result,
  selectedAnswer,
  onAnimationComplete,
  duration = 2000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'display' | 'exit'>('enter');

  useEffect(() => {
    if (result) {
      setIsVisible(true);
      setAnimationPhase('enter');
      
      // Enter animation
      const enterTimer = setTimeout(() => {
        setAnimationPhase('display');
      }, 100);
      
      // Exit animation
      const exitTimer = setTimeout(() => {
        setAnimationPhase('exit');
      }, duration - 500);
      
      // Complete animation
      const completeTimer = setTimeout(() => {
        setIsVisible(false);
        onAnimationComplete?.();
      }, duration);
      
      return () => {
        clearTimeout(enterTimer);
        clearTimeout(exitTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [result, duration, onAnimationComplete]);

  if (!result || !isVisible) {
    return null;
  }

  const getFeedbackClass = (): string => {
    let className = `result-feedback ${result.isCorrect ? 'correct' : 'incorrect'}`;
    className += ` ${animationPhase}`;
    return className;
  };

  const getFeedbackMessage = (): string => {
    if (result.isCorrect) {
      const messages = [
        'Correct!',
        'Well done!',
        'Excellent!',
        'Perfect!',
        'Great job!'
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    } else {
      return 'Incorrect';
    }
  };

  const formatScore = (score: number): string => {
    return score.toLocaleString();
  };

  return (
    <div className={getFeedbackClass()}>
      <div className="feedback-content">
        <div className="feedback-icon">
          {result.isCorrect ? '✓' : '✗'}
        </div>
        
        <div className="feedback-message">
          <h3>{getFeedbackMessage()}</h3>
        </div>
        
        <div className="feedback-details">
          {!result.isCorrect && (
            <div className="correct-answer">
              <span className="label">Correct answer:</span>
              <span className="answer">{result.correctAnswer.name}</span>
            </div>
          )}
          
          {selectedAnswer && !result.isCorrect && (
            <div className="selected-answer">
              <span className="label">You selected:</span>
              <span className="answer">{selectedAnswer.name}</span>
            </div>
          )}
          
          <div className="score-earned">
            <span className="label">Points earned:</span>
            <span className="points">+{formatScore(result.totalScore)}</span>
          </div>
          
          {result.timeBonus && result.timeBonus > 0 && (
            <div className="time-bonus">
              <span className="label">Time bonus:</span>
              <span className="bonus">+{formatScore(result.timeBonus)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultFeedback;