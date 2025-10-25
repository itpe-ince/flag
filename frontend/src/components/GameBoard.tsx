import React from 'react';
import { Question } from '../types';
import ChoiceButton from './ChoiceButton';
import Timer from './Timer';
import './GameBoard.css';

interface GameBoardProps {
  question: Question;
  timeRemaining: number;
  onAnswerSelect: (countryCode: string) => void;
  onTimeUp: () => void;
  disabled?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  question,
  timeRemaining,
  onAnswerSelect,
  onTimeUp,
  disabled = false
}) => {
  return (
    <div className="game-board">
      <div className="timer-container">
        <Timer 
          timeRemaining={timeRemaining}
          totalTime={question.timeLimit}
          onTimeUp={onTimeUp}
        />
      </div>
      
      <div className="flag-container">
        <img 
          src={question.correctCountry.imageUrl} 
          alt="Flag to identify"
          className="flag-image"
        />
      </div>
      
      <div className="question-text">
        <h2>Which country does this flag belong to?</h2>
      </div>
      
      <div className="choices-container">
        {question.choices.map((country, index) => (
          <ChoiceButton
            key={country.code}
            country={country}
            index={index}
            onClick={() => onAnswerSelect(country.code)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;