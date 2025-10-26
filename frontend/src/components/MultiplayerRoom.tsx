import React, { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Room, Question, AnswerResult } from '../types';
import GameBoard from './GameBoard';
import Timer from './Timer';
import ScoreDisplay from './ScoreDisplay';
import ResultFeedback from './ResultFeedback';
import './MultiplayerRoom.css';

interface MultiplayerRoomProps {
  socket: Socket;
  room: Room;
  onGameEnd: (finalRoom: Room) => void;
  onLeaveRoom: () => void;
}

const MultiplayerRoom: React.FC<MultiplayerRoomProps> = ({ 
  socket, 
  room: initialRoom, 
  onGameEnd, 
  onLeaveRoom 
}) => {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds] = useState<number>(10);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState<boolean>(false);

  // Get current player info
  const currentPlayer = room.currentPlayers.find(p => p.userId === socket.id);
  const currentScore = currentPlayer?.score || 0;

  useEffect(() => {
    // Socket event listeners for multiplayer game
    socket.on('questionBroadcast', (data: { question: Question; round: number; timeLimit: number }) => {
      setCurrentQuestion(data.question);
      setCurrentRound(data.round);
      setTimeRemaining(data.timeLimit);
      setHasAnswered(false);
      setAnswerResult(null);
      setShowResult(false);
      setWaitingForNextQuestion(false);
      setGameStatus('playing');
    });

    socket.on('answerResult', (result: AnswerResult) => {
      setAnswerResult(result);
      setShowResult(true);
      setWaitingForNextQuestion(true);
    });

    socket.on('scoresUpdated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('gameFinished', (finalRoom: Room) => {
      setRoom(finalRoom);
      setGameStatus('finished');
      setTimeout(() => {
        onGameEnd(finalRoom);
      }, 5000); // Show final results for 5 seconds
    });

    socket.on('playerLeft', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('roomClosed', () => {
      onLeaveRoom();
    });

    return () => {
      socket.off('questionBroadcast');
      socket.off('answerResult');
      socket.off('scoresUpdated');
      socket.off('gameFinished');
      socket.off('playerLeft');
      socket.off('roomClosed');
    };
  }, [socket, onGameEnd, onLeaveRoom]);

  const handleAnswerSelect = useCallback((countryCode: string) => {
    if (hasAnswered || !currentQuestion) return;

    // Find the index of the selected country
    const answerIndex = currentQuestion.choices.findIndex(choice => choice.code === countryCode);
    if (answerIndex === -1) return;

    setHasAnswered(true);

    // Send answer to server
    socket.emit('submitAnswer', {
      roomId: room.id,
      questionId: currentQuestion.id,
      answerIndex,
      responseTime: 30 - timeRemaining // Calculate response time
    });
  }, [hasAnswered, currentQuestion, socket, room.id, timeRemaining]);

  const handleTimeUp = useCallback(() => {
    if (!hasAnswered && currentQuestion) {
      setHasAnswered(true);
      // Submit no answer (timeout)
      socket.emit('submitAnswer', {
        roomId: room.id,
        questionId: currentQuestion.id,
        answerIndex: -1, // -1 indicates timeout
        responseTime: 30
      });
    }
  }, [hasAnswered, currentQuestion, socket, room.id]);

  const handleLeaveRoom = () => {
    socket.emit('leaveRoom', { roomId: room.id });
    onLeaveRoom();
  };

  if (gameStatus === 'finished') {
    // Sort players with tie-breaking logic
    const sortedPlayers = [...room.currentPlayers].sort((a, b) => {
      // Primary sort: by score (descending)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      
      // Tie-breaker 1: by number of correct answers (descending)
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      
      // Tie-breaker 2: by total response time (ascending - faster is better)
      if (a.totalResponseTime !== undefined && b.totalResponseTime !== undefined) {
        if (a.totalResponseTime !== b.totalResponseTime) {
          return a.totalResponseTime - b.totalResponseTime;
        }
      }
      
      // Final tie-breaker: alphabetical order by username
      return a.username.localeCompare(b.username);
    });

    const winner = sortedPlayers[0];
    const isTie = sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score;

    return (
      <div className="multiplayer-room finished">
        <div className="game-finished">
          <div className="winner-announcement">
            {isTie ? (
              <>
                <h2>🤝 It's a Tie!</h2>
                <p className="tie-message">
                  Multiple players achieved the same score of {winner.score} points!
                </p>
                <p className="tie-explanation">
                  Ranking determined by correct answers and response speed.
                </p>
              </>
            ) : (
              <>
                <h2>🎉 {winner.username} Wins!</h2>
                <p className="winner-message">
                  Congratulations on your victory with {winner.score} points!
                </p>
                {winner.correctAnswers === totalRounds && (
                  <p className="perfect-score">Perfect game! 🌟</p>
                )}
              </>
            )}
          </div>
          
          <div className="final-leaderboard">
            <h3>Final Results</h3>
            <div className="leaderboard">
              {sortedPlayers.map((player, index) => {
                const isWinner = index === 0;
                const isTiedForFirst = player.score === sortedPlayers[0].score;
                
                return (
                  <div 
                    key={player.userId} 
                    className={`leaderboard-entry ${isWinner ? 'winner' : ''} ${isTiedForFirst && isTie ? 'tied' : ''}`}
                  >
                    <span className="rank">
                      #{index + 1}
                      {isTiedForFirst && isTie && ' 🤝'}
                    </span>
                    <span className="player-name">
                      {player.username}
                      {isWinner && !isTie && ' 👑'}
                      {player.userId === socket.id && ' (You)'}
                    </span>
                    <span className="score">{player.score} pts</span>
                    <span className="accuracy">
                      {player.correctAnswers}/{totalRounds} correct
                      {player.correctAnswers > 0 && (
                        <span className="percentage">
                          ({Math.round((player.correctAnswers / totalRounds) * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="game-stats">
            <h4>Game Statistics</h4>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-label">Total Rounds:</span>
                <span className="stat-value">{totalRounds}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Players:</span>
                <span className="stat-value">{room.currentPlayers.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Highest Score:</span>
                <span className="stat-value">{sortedPlayers[0]?.score || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Average Score:</span>
                <span className="stat-value">
                  {Math.round(
                    room.currentPlayers.reduce((sum, p) => sum + p.score, 0) / 
                    room.currentPlayers.length
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="game-actions">
            <button onClick={handleLeaveRoom} className="leave-button">
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameStatus === 'waiting' || !currentQuestion) {
    return (
      <div className="multiplayer-room waiting">
        <div className="waiting-screen">
          <h2>Waiting for next question...</h2>
          <div className="room-info">
            <p>Room: {room.id}</p>
            <p>Round: {currentRound}/{totalRounds}</p>
          </div>
          
          <div className="current-scores">
            <h3>Current Scores</h3>
            <div className="scores-list">
              {room.currentPlayers
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div key={player.userId} className="score-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="player-name">{player.username}</span>
                    <span className="score">{player.score} pts</span>
                  </div>
                ))}
            </div>
          </div>

          <button onClick={handleLeaveRoom} className="leave-button">
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="multiplayer-room playing">
      <div className="game-header">
        <div className="room-info">
          <span className="room-id">Room: {room.id}</span>
          <span className="round-info">Round {currentRound}/{totalRounds}</span>
        </div>
        
        <Timer 
          timeRemaining={timeRemaining}
          totalTime={30}
          onTimeUp={handleTimeUp}
        />
        
        <button onClick={handleLeaveRoom} className="leave-button-small">
          Leave
        </button>
      </div>

      <div className="game-content">
        <div className="main-game">
          <GameBoard
            question={currentQuestion}
            timeRemaining={timeRemaining}
            onAnswerSelect={handleAnswerSelect}
            onTimeUp={handleTimeUp}
            disabled={hasAnswered}
          />

          {showResult && answerResult && (
            <ResultFeedback
              result={answerResult}
            />
          )}

          {waitingForNextQuestion && (
            <div className="waiting-overlay">
              <p>Waiting for other players...</p>
            </div>
          )}
        </div>

        <div className="sidebar">
          <ScoreDisplay 
            score={currentScore}
            level={currentRound}
            showLevel={false}
          />

          <div className="players-scores">
            <h3>Live Scores</h3>
            <div className="players-list">
              {room.currentPlayers
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div 
                    key={player.userId} 
                    className={`player-score ${player.userId === socket.id ? 'current-player' : ''}`}
                  >
                    <span className="rank">#{index + 1}</span>
                    <span className="name">{player.username}</span>
                    <span className="score">{player.score}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="game-progress">
            <h4>Progress</h4>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(currentRound / totalRounds) * 100}%` }}
              />
            </div>
            <p>{currentRound}/{totalRounds} rounds</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerRoom;