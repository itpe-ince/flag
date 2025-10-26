import React, { useState, useEffect, useCallback } from 'react';
import { Question, AnswerResult, Country } from '../types';
import GameBoard from './GameBoard';
import ScoreDisplay from './ScoreDisplay';
import ResultFeedback from './ResultFeedback';
import { usePreloadFlags } from '../hooks/usePreloadFlags';
import './SinglePlayerGame.css';

interface SinglePlayerGameProps {
  onBack: () => void;
}

interface GameSession {
  id: string;
  level: number;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  isGameOver: boolean;
  currentQuestion?: Question;
  timeRemaining: number;
}

const SinglePlayerGame: React.FC<SinglePlayerGameProps> = ({ onBack }) => {
  const [gameSession, setGameSession] = useState<GameSession>({
    id: '',
    level: 1,
    score: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    isGameOver: false,
    timeRemaining: 30
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnswerResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<Country | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Preload upcoming flags for better performance
  usePreloadFlags(gameSession.currentQuestion || null, {
    enabled: gameStarted && !gameSession.isGameOver,
    preloadCount: 5,
    preloadDelay: 2000 // Wait 2 seconds after question loads
  });

  // Calculate choice count based on level (2^level pattern)
  const getChoiceCount = (level: number): number => {
    return Math.pow(2, level);
  };

  // Calculate level multiplier for scoring
  const getLevelMultiplier = (level: number): number => {
    return Math.pow(2, level - 1);
  };

  // Create a new game session
  const createGame = async (): Promise<string> => {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'single',
        createdBy: 'd6184d2c-fb6f-4c44-b5fc-f8fe48f02b70', // TODO: Replace with actual user ID when auth is implemented
        settings: {
          difficultyProgression: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create game');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create game');
    }

    return result.data.id;
  };

  // Generate a question for the current level
  const generateQuestion = async (level: number, gameId?: string): Promise<Question> => {
    const currentGameId = gameId || gameSession.id;
    if (!currentGameId) {
      throw new Error('Game session not initialized');
    }

    const round = gameSession.totalQuestions + 1;
    
    const response = await fetch(`/api/games/${currentGameId}/question?round=${round}&level=${level}`);
    
    if (!response.ok) {
      throw new Error('Failed to generate question');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to generate question');
    }

    return result.data;
  };

  // Start a new game
  const startGame = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const gameId = await createGame();
      
      // Start the game on the backend
      const startResponse = await fetch(`/api/games/${gameId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start game');
      }

      const startResult = await startResponse.json();
      if (!startResult.success) {
        throw new Error(startResult.error?.message || 'Failed to start game');
      }
      
      // Initialize game session
      setGameSession(prev => ({
        ...prev,
        id: gameId,
        level: 1,
        score: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        isGameOver: false,
        timeRemaining: 30
      }));
      
      // Generate first question
      const firstQuestion = await generateQuestion(1, gameId);
      setGameSession(prev => ({
        ...prev,
        currentQuestion: firstQuestion
      }));
      
      setGameStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  // Load next question
  const loadNextQuestion = async () => {
    if (gameSession.isGameOver) return;
    
    setIsLoading(true);
    try {
      const nextQuestion = await generateQuestion(gameSession.level);
      setGameSession(prev => ({
        ...prev,
        currentQuestion: nextQuestion,
        timeRemaining: 30
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = useCallback(async (countryCode: string) => {
    if (!gameSession.currentQuestion || isAnswering || !gameSession.id) return;
    
    setIsAnswering(true);
    
    const question = gameSession.currentQuestion;
    const selectedChoice = question.choices.find(c => c.code === countryCode);
    const selectedIndex = question.choices.findIndex(c => c.code === countryCode);
    
    if (!selectedChoice) return;
    
    setSelectedAnswer(selectedChoice);
    
    const responseTime = 30 - gameSession.timeRemaining;
    
    try {
      // Validate answer using backend API
      const response = await fetch(`/api/games/${gameSession.id}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: question.id,
          userId: 'd6184d2c-fb6f-4c44-b5fc-f8fe48f02b70', // TODO: Replace with actual user ID when auth is implemented
          selectedChoice: selectedIndex,
          responseTime,
          question
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate answer');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to validate answer');
      }

      const answerResult = result.data;
      
      const frontendResult: AnswerResult = answerResult;
      
      setCurrentResult(frontendResult);
      
      // Update game session
      setGameSession(prev => ({
        ...prev,
        score: prev.score + answerResult.totalScore,
        correctAnswers: prev.correctAnswers + (answerResult.isCorrect ? 1 : 0),
        totalQuestions: prev.totalQuestions + 1,
        level: answerResult.isCorrect ? prev.level + 1 : prev.level,
        isGameOver: !answerResult.isCorrect
      }));
      
    } catch (err) {
      console.error('Error validating answer:', err);
      
      // Fallback to client-side calculation if backend fails
      const correctIndex = question.choices.findIndex(c => c.code === question.correctCountry.code);
      const isCorrect = selectedIndex === correctIndex;
      
      let score = 0;
      let timeBonus = 0;
      
      if (isCorrect) {
        const baseScore = 100;
        const levelMultiplier = getLevelMultiplier(gameSession.level);
        timeBonus = Math.max(0, Math.floor(50 * (gameSession.timeRemaining / 30)));
        score = (baseScore * levelMultiplier) + timeBonus;
      }
      
      const fallbackResult: AnswerResult = {
        isCorrect,
        correctAnswer: question.correctCountry,
        score,
        timeBonus,
        totalScore: score
      };
      
      setCurrentResult(fallbackResult);
      
      // Update game session
      setGameSession(prev => ({
        ...prev,
        score: prev.score + score,
        correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
        totalQuestions: prev.totalQuestions + 1,
        level: isCorrect ? prev.level + 1 : prev.level,
        isGameOver: !isCorrect
      }));
    }
    
  }, [gameSession.currentQuestion, gameSession.timeRemaining, gameSession.level, gameSession.id, isAnswering]);

  // Handle time up
  const handleTimeUp = useCallback(() => {
    if (!gameSession.currentQuestion || isAnswering) return;
    
    setIsAnswering(true);
    
    const result: AnswerResult = {
      isCorrect: false,
      correctAnswer: gameSession.currentQuestion.correctCountry,
      score: 0,
      timeBonus: 0,
      totalScore: 0
    };
    
    setCurrentResult(result);
    
    // Update game session - time up means game over
    setGameSession(prev => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1,
      isGameOver: true
    }));
  }, [gameSession.currentQuestion, isAnswering]);

  // Handle result animation complete
  const handleResultComplete = () => {
    setCurrentResult(null);
    setSelectedAnswer(null);
    setIsAnswering(false);
    
    if (gameSession.isGameOver) {
      // Submit final score
      submitGameResult();
    } else {
      // Load next question
      loadNextQuestion();
    }
  };

  // Submit game result to backend
  const submitGameResult = async () => {
    if (!gameSession.id) return;
    
    try {
      const response = await fetch(`/api/games/${gameSession.id}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: gameSession.id,
          userId: 'd6184d2c-fb6f-4c44-b5fc-f8fe48f02b70', // TODO: Replace with actual user ID when auth is implemented
          score: gameSession.score,
          correctAnswers: gameSession.correctAnswers,
          totalQuestions: gameSession.totalQuestions,
          completionTime: gameSession.totalQuestions * 30 // Approximate completion time
        }),
      });

      if (!response.ok) {
        console.error('Failed to submit game result');
      }
    } catch (err) {
      console.error('Error submitting game result:', err);
    }
  };

  // Timer countdown effect
  useEffect(() => {
    if (!gameStarted || gameSession.isGameOver || isAnswering || !gameSession.currentQuestion) {
      return;
    }

    const timer = setInterval(() => {
      setGameSession(prev => {
        if (prev.timeRemaining <= 1) {
          handleTimeUp();
          return prev;
        }
        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameSession.isGameOver, isAnswering, gameSession.currentQuestion, handleTimeUp]);

  // Restart game
  const restartGame = () => {
    setGameSession({
      id: '',
      level: 1,
      score: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      isGameOver: false,
      timeRemaining: 30
    });
    setCurrentResult(null);
    setSelectedAnswer(null);
    setIsAnswering(false);
    setGameStarted(false);
    setError(null);
  };

  // Render game start screen
  if (!gameStarted) {
    return (
      <div className="single-player-game">
        <div className="game-start-screen">
          <div className="game-header">
            <h1>Single Player Mode</h1>
            <p>Test your flag knowledge with progressive difficulty!</p>
          </div>
          
          <div className="game-rules">
            <h3>How to Play:</h3>
            <ul>
              <li>Start with 2 choices, double each level (2, 4, 8, 16...)</li>
              <li>Each correct answer advances you to the next level</li>
              <li>Score multiplier increases with each level (2^level)</li>
              <li>Game ends on first wrong answer or time up</li>
              <li>Faster answers earn time bonus points</li>
            </ul>
          </div>
          
          <div className="game-actions">
            <button 
              className="start-button"
              onClick={startGame}
              disabled={isLoading}
            >
              {isLoading ? 'Starting...' : 'Start Game'}
            </button>
            
            <button 
              className="back-button"
              onClick={onBack}
              disabled={isLoading}
            >
              Back to Menu
            </button>
          </div>
          
          {error && (
            <div className="error-message">
              <p>Error: {error}</p>
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render game over screen
  if (gameSession.isGameOver) {
    return (
      <div className="single-player-game">
        <div className="game-over-screen">
          <div className="game-over-header">
            <h1>Game Over!</h1>
            <p>You reached level {gameSession.level}</p>
          </div>
          
          <div className="final-stats">
            <ScoreDisplay
              score={gameSession.score}
              level={gameSession.level}
              correctAnswers={gameSession.correctAnswers}
              totalQuestions={gameSession.totalQuestions}
              multiplier={getLevelMultiplier(gameSession.level)}
              showLevel={true}
            />
          </div>
          
          <div className="game-over-actions">
            <button 
              className="restart-button"
              onClick={restartGame}
            >
              Play Again
            </button>
            
            <button 
              className="back-button"
              onClick={onBack}
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render main game
  return (
    <div className="single-player-game">
      <div className="game-header">
        <div className="game-info">
          <h2>Level {gameSession.level}</h2>
          <p>{getChoiceCount(gameSession.level)} choices</p>
        </div>
        
        <ScoreDisplay
          score={gameSession.score}
          level={gameSession.level}
          correctAnswers={gameSession.correctAnswers}
          totalQuestions={gameSession.totalQuestions}
          multiplier={getLevelMultiplier(gameSession.level)}
          showLevel={true}
        />
      </div>
      
      {isLoading ? (
        <div className="loading-screen">
          <p>Loading next question...</p>
        </div>
      ) : gameSession.currentQuestion ? (
        <GameBoard
          question={gameSession.currentQuestion}
          timeRemaining={gameSession.timeRemaining}
          onAnswerSelect={handleAnswerSelect}
          onTimeUp={handleTimeUp}
          disabled={isAnswering}
        />
      ) : (
        <div className="loading-screen">
          <p>Preparing question...</p>
        </div>
      )}
      
      <ResultFeedback
        result={currentResult}
        selectedAnswer={selectedAnswer || undefined}
        onAnimationComplete={handleResultComplete}
      />
      
      {error && (
        <div className="error-overlay">
          <div className="error-message">
            <p>Error: {error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SinglePlayerGame;