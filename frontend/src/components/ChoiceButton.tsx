import React from 'react';
import { Country } from '../types';
import './ChoiceButton.css';

interface ChoiceButtonProps {
  country: Country;
  index: number;
  onClick: () => void;
  disabled?: boolean;
  isCorrect?: boolean;
  isSelected?: boolean;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({
  country,
  index,
  onClick,
  disabled = false,
  isCorrect,
  isSelected
}) => {
  const getButtonClass = () => {
    let className = 'choice-button';
    
    if (disabled) {
      className += ' disabled';
    }
    
    if (isSelected) {
      className += ' selected';
    }
    
    if (isCorrect !== undefined) {
      className += isCorrect ? ' correct' : ' incorrect';
    }
    
    return className;
  };

  const getChoiceLabel = (index: number): string => {
    return String.fromCharCode(65 + index); // A, B, C, D, etc.
  };

  return (
    <button
      className={getButtonClass()}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <span className="choice-label">{getChoiceLabel(index)}</span>
      <span className="choice-text">{country.name}</span>
    </button>
  );
};

export default ChoiceButton;