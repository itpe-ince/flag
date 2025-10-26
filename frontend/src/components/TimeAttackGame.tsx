import React, { useState, useEffect, useCallback } from 'react';
import { Question, AnswerResult, Country } from '../types';
import GameBoard from './GameBoard';
import ScoreDisplay from './ScoreDisplay';
import ResultFeedback from './ResultFeedback';
import './TimeAttackGame.css';

interface TimeAttackGameProps {
  onBack: () => void;
}

interface TimeAttackSession {
  id: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  isGameOver: boolean;
  currentQuestion?: Question;
  timeRemaining: number;
  gameTimeRemaining: number;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  gamesPlayed: number;
  accuracy: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  timeframe: string;
}

const TimeAttackGame: React.FC<TimeAttackGameProps> = ({ onBack }) => {
  const [gameSession, setGameSession] = useState<TimeAttackSession>({
    id: '',
    score: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    isGameOver: false,
    timeRemaining: 30,
    gameTimeRemaining: 60
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnswerResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<Country | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboards, setLeaderboards] = useState<{
    daily: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
    alltime: LeaderboardEntry[];
  }>({
    daily: [],
    weekly: [],
    alltime: []
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'alltime'>('daily');

  // Create a new game session
  const createGame = async (): Promise<string> => {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'timeattack',
        createdBy: 'd6184d2c-fb6f-4c44-b5fc-f8fe48f02b70', // TODO: Replace with actual user ID when auth is implemented
        settings: {
          timeLimit: 60,
          difficultyProgression: false
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

  // Generate a question for time attack mode
  const generateQuestion = async (gameId?: string): Promise<Question> => {
    const currentGameId = gameId || gameSession.id;
    if (!currentGameId) {
      throw new Error('Game session not initialized');
    }

    const round = gameSession.totalQuestions + 1;
    
    const response = await fetch(`/api/games/${currentGameId}/question?round=${round}&level=1`);
    
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
        score: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        isGameOver: false,
        timeRemaining: 30,
        gameTimeRemaining: 60
      }));
      
      // Generate first question
      const firstQuestion = await generateQuestion(gameId);
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
    if (gameSession.isGameOver || gameSession.gameTimeRemaining <= 0) return;
    
    setIsLoading(true);
    try {
      const nextQuestion = await generateQuestion();
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

  // Calculate time bonus based on response speed
  const calculateTimeBonus = (responseTime: number): number => {
    const maxBonus = 50;
    const timeLimit = 30;
    const remainingTime = timeLimit - responseTime;
    return Math.max(0, Math.floor(maxBonus * (remainingTime / timeLimit)));
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
        totalQuestions: prev.totalQuestions + 1
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
        timeBonus = calculateTimeBonus(responseTime);
        score = baseScore + timeBonus;
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
        totalQuestions: prev.totalQuestions + 1
      }));
    }
    
  }, [gameSession.currentQuestion, gameSession.timeRemaining, gameSession.id, isAnswering]);

  // Handle question time up
  const handleQuestionTimeUp = useCallback(() => {
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
    
    // Update game session - continue game but mark question as incorrect
    setGameSession(prev => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1
    }));
  }, [gameSession.currentQuestion, isAnswering]);

  // Handle game time up
  const handleGameTimeUp = useCallback(() => {
    if (gameSession.isGameOver) return;
    
    setGameSession(prev => ({
      ...prev,
      isGameOver: true,
      gameTimeRemaining: 0
    }));
    
    // If currently answering a question, let it complete
    if (!isAnswering && !currentResult) {
      handleQuestionTimeUp();
    }
  }, [gameSession.isGameOver, isAnswering, currentResult, handleQuestionTimeUp]);

  // Handle result animation complete
  const handleResultComplete = () => {
    setCurrentResult(null);
    setSelectedAnswer(null);
    setIsAnswering(false);
    
    if (gameSession.isGameOver || gameSession.gameTimeRemaining <= 0) {
      // Submit final score and end game
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
          completionTime: 60 // Time attack is always 60 seconds
        }),
      });

      if (!response.ok) {
        console.error('Failed to submit game result');
      }
    } catch (err) {
      console.error('Error submitting game result:', err);
    }
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async (timeframe: 'daily' | 'weekly' | 'alltime') => {
    try {
      const response = await fetch(`/api/leaderboards/${timeframe}?limit=10`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${timeframe} leaderboard`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || `Failed to fetch ${timeframe} leaderboard`);
      }

      const leaderboardData: LeaderboardResponse = result.data;
      
      setLeaderboards(prev => ({
        ...prev,
        [timeframe]: leaderboardData.leaderboard
      }));
    } catch (err) {
      console.error(`Error fetching ${timeframe} leaderboard:`, err);
    }
  };

  // Load all leaderboards
  const loadLeaderboards = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchLeaderboard('daily'),
        fetchLeaderboard('weekly'),
        fetchLeaderboard('alltime')
      ]);
    } catch (err) {
      console.error('Error loading leaderboards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Question timer countdown effect
  useEffect(() => {
    if (!gameStarted || gameSession.isGameOver || isAnswering || !gameSession.currentQuestion || gameSession.gameTimeRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setGameSession(prev => {
        if (prev.timeRemaining <= 1) {
          handleQuestionTimeUp();
          return prev;
        }
        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameSession.isGameOver, isAnswering, gameSession.currentQuestion, gameSession.gameTimeRemaining, handleQuestionTimeUp]);

  // Game timer countdown effect
  useEffect(() => {
    if (!gameStarted || gameSession.isGameOver || gameSession.gameTimeRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setGameSession(prev => {
        if (prev.gameTimeRemaining <= 1) {
          handleGameTimeUp();
          return {
            ...prev,
            gameTimeRemaining: 0
          };
        }
        return {
          ...prev,
          gameTimeRemaining: prev.gameTimeRemaining - 1
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameSession.isGameOver, gameSession.gameTimeRemaining, handleGameTimeUp]);

  // Restart game
  const restartGame = () => {
    setGameSession({
      id: '',
      score: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      isGameOver: false,
      timeRemaining: 30,
      gameTimeRemaining: 60
    });
    setCurrentResult(null);
    setSelectedAnswer(null);
    setIsAnswering(false);
    setGameStarted(false);
    setShowLeaderboard(false);
    setError(null);
  };

  // Show leaderboard
  const handleShowLeaderboard = () => {
    setShowLeaderboard(true);
    loadLeaderboards();
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate accuracy percentage
  const getAccuracy = (): number => {
    if (gameSession.totalQuestions === 0) return 0;
    return Math.round((gameSession.correctAnswers / gameSession.totalQuestions) * 100);
  };

  // Render leaderboard screen
  if (showLeaderboard) {
    return (
      <div className="time-attack-game">
        <div className="leaderboard-screen">
          <div className="leaderboard-header">
            <h1>Leaderboards</h1>
            <p>See how you rank against other players!</p>
          </div>
          
          <div className="timeframe-selector">
            <button 
              className={selectedTimeframe === 'daily' ? 'active' : ''}
              onClick={() => setSelectedTimeframe('daily')}
            >
              Daily
            </button>
            <button 
              className={selectedTimeframe === 'weekly' ? 'active' : ''}
              onClick={() => setSelectedTimeframe('weekly')}
            >
              Weekly
            </button>
            <button 
              className={selectedTimeframe === 'alltime' ? 'active' : ''}
              onClick={() => setSelectedTimeframe('alltime')}
            >
              All Time
            </button>
          </div>
          
          <div className="leaderboard-content">
            {isLoading ? (
              <div className="loading-screen">
                <p>Loading leaderboard...</p>
              </div>
            ) : (
              <div className="leaderboard-list">
                <div className="leaderboard-headers">
                  <span>Rank</span>
                  <span>Player</span>
                  <span>Score</span>
                  <span>Games</span>
                  <span>Accuracy</span>
                </div>
                {leaderboards[selectedTimeframe].map((entry) => (
                  <div key={entry.userId} className="leaderboard-entry">
                    <span className="rank">#{entry.rank}</span>
                    <span className="username">{entry.username}</span>
                    <span className="score">{entry.score.toLocaleString()}</span>
                    <span className="games">{entry.gamesPlayed}</span>
                    <span className="accuracy">{entry.accuracy}%</span>
                  </div>
                ))}
                {leaderboards[selectedTimeframe].length === 0 && (
                  <div className="no-entries">
                    <p>No entries yet for {selectedTimeframe} leaderboard</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="leaderboard-actions">
            <button 
              className="back-button"
              onClick={() => setShowLeaderboard(false)}
            >
              Back to Game
            </button>
            
            <button 
              className="refresh-button"
              onClick={loadLeaderboards}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render game start screen
  if (!gameStarted) {
    return (
      <div className="time-attack-game">
        <div className="game-start-screen">
          <div className="game-header">
            <h1>Time Attack Mode</h1>
            <p>Answer as many flags as possible in 60 seconds!</p>
          </div>
          
          <div className="game-rules">
            <h3>How to Play:</h3>
            <ul>
              <li>You have 60 seconds to answer as many questions as possible</li>
              <li>Each question has a 30-second time limit</li>
              <li>Faster answers earn time bonus points</li>
              <li>Wrong answers don't end the game - keep going!</li>
              <li>Compete on daily, weekly, and all-time leaderboards</li>
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
              className="leaderboard-button"
              onClick={handleShowLeaderboard}
            >
              View Leaderboards
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
  if (gameSession.isGameOver || gameSession.gameTimeRemaining <= 0) {
    return (
      <div className="time-attack-game">
        <div className="game-over-screen">
          <div className="game-over-header">
            <h1>Time's Up!</h1>
            <p>Great job! Here's how you did:</p>
          </div>
          
          <div className="final-stats">
            <div className="stat-item">
              <span className="stat-label">Final Score</span>
              <span className="stat-value">{gameSession.score.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Correct Answers</span>
              <span className="stat-value">{gameSession.correctAnswers} / {gameSession.totalQuestions}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">{getAccuracy()}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Questions per Minute</span>
              <span className="stat-value">{gameSession.totalQuestions}</span>
            </div>
          </div>
          
          <div className="game-over-actions">
            <button 
              className="restart-button"
              onClick={restartGame}
            >
              Play Again
            </button>
            
            <button 
              className="leaderboard-button"
              onClick={handleShowLeaderboard}
            >
              View Leaderboards
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
    <div className="time-attack-game">
      <div className="game-header">
        <div className="game-info">
          <h2>Time Attack</h2>
          <p>Game Time: {formatTime(gameSession.gameTimeRemaining)}</p>
        </div>
        
        <ScoreDisplay
          score={gameSession.score}
          level={1}
          correctAnswers={gameSession.correctAnswers}
          totalQuestions={gameSession.totalQuestions}
          multiplier={1}
          showLevel={false}
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
          onTimeUp={handleQuestionTimeUp}
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

export default TimeAttackGame;