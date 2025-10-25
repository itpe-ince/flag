import React, { useEffect, useState } from 'react';
import './Timer.css';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  onTimeUp: () => void;
}

const Timer: React.FC<TimerProps> = ({
  timeRemaining,
  totalTime,
  onTimeUp
}) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining);

  useEffect(() => {
    setDisplayTime(timeRemaining);
    
    if (timeRemaining <= 0) {
      onTimeUp();
    }
  }, [timeRemaining, onTimeUp]);

  const getProgressPercentage = (): number => {
    return (displayTime / totalTime) * 100;
  };

  const getTimerClass = (): string => {
    const percentage = getProgressPercentage();
    let className = 'timer';
    
    if (percentage <= 20) {
      className += ' critical';
    } else if (percentage <= 50) {
      className += ' warning';
    }
    
    return className;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    return secs.toString();
  };

  return (
    <div className={getTimerClass()}>
      <div className="timer-display">
        <span className="time-text">{formatTime(displayTime)}</span>
      </div>
      <div className="timer-progress">
        <div 
          className="timer-progress-bar"
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
    </div>
  );
};

export default Timer;