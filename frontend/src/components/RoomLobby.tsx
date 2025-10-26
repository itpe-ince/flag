import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room, RoomSettings } from '../types';
import './RoomLobby.css';

interface RoomLobbyProps {
  onBack: () => void;
  onGameStart: (room: Room) => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({ onBack, onGameStart }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    maxPlayers: 4,
    roundCount: 10,
    timeLimit: 30
  });
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('roomCreated', (room: Room) => {
      setCurrentRoom(room);
      setIsCreatingRoom(false);
      setError(null);
    });

    newSocket.on('roomJoined', (room: Room) => {
      setCurrentRoom(room);
      setIsJoiningRoom(false);
      setError(null);
    });

    newSocket.on('playerJoined', (room: Room) => {
      setCurrentRoom(room);
    });

    newSocket.on('playerLeft', (room: Room) => {
      setCurrentRoom(room);
    });

    newSocket.on('playerReady', (room: Room) => {
      setCurrentRoom(room);
    });

    newSocket.on('gameStarted', (room: Room) => {
      onGameStart(room);
    });

    newSocket.on('error', (errorMessage: string) => {
      setError(errorMessage);
      setIsCreatingRoom(false);
      setIsJoiningRoom(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [onGameStart]);

  const handleCreateRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsCreatingRoom(true);
    setError(null);
    socket?.emit('createRoom', { username: username.trim(), settings: roomSettings });
  };

  const handleJoinRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setIsJoiningRoom(true);
    setError(null);
    socket?.emit('joinRoom', { roomId: roomId.trim(), username: username.trim() });
  };

  const handleLeaveRoom = () => {
    socket?.emit('leaveRoom', { roomId: currentRoom?.id });
    setCurrentRoom(null);
    setIsReady(false);
  };

  const handleToggleReady = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    socket?.emit('toggleReady', { roomId: currentRoom?.id, isReady: newReadyState });
  };

  const handleStartGame = () => {
    socket?.emit('startGame', { roomId: currentRoom?.id });
  };

  const isHost = currentRoom?.hostUserId === socket?.id;
  const allPlayersReady = currentRoom?.currentPlayers.every(player => player.isReady) || false;
  const canStartGame = isHost && allPlayersReady && (currentRoom?.currentPlayers.length || 0) >= 2;

  if (currentRoom) {
    return (
      <div className="room-lobby">
        <div className="room-header">
          <h2>Room: {currentRoom.id}</h2>
          <button onClick={handleLeaveRoom} className="leave-button">
            Leave Room
          </button>
        </div>

        <div className="room-info">
          <div className="room-settings">
            <h3>Game Settings</h3>
            <p>Max Players: {currentRoom.maxPlayers}</p>
            <p>Rounds: {roomSettings.roundCount}</p>
            <p>Time per Question: {roomSettings.timeLimit}s</p>
          </div>

          <div className="players-list">
            <h3>Players ({currentRoom.currentPlayers.length}/{currentRoom.maxPlayers})</h3>
            <div className="players">
              {currentRoom.currentPlayers.map((player) => (
                <div key={player.userId} className={`player ${player.isReady ? 'ready' : 'not-ready'}`}>
                  <span className="player-name">
                    {player.username}
                    {player.userId === currentRoom.hostUserId && ' (Host)'}
                  </span>
                  <span className={`ready-status ${player.isReady ? 'ready' : 'not-ready'}`}>
                    {player.isReady ? '✓ Ready' : '⏳ Not Ready'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lobby-actions">
          <button 
            onClick={handleToggleReady}
            className={`ready-button ${isReady ? 'ready' : 'not-ready'}`}
          >
            {isReady ? 'Not Ready' : 'Ready'}
          </button>

          {isHost && (
            <button 
              onClick={handleStartGame}
              disabled={!canStartGame}
              className="start-game-button"
            >
              Start Game
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="room-lobby">
      <div className="lobby-header">
        <h2>Multiplayer Lobby</h2>
        <button onClick={onBack} className="back-button">
          Back to Menu
        </button>
      </div>

      <div className="username-input">
        <label htmlFor="username">Username:</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          maxLength={20}
        />
      </div>

      <div className="room-actions">
        <div className="create-room-section">
          <h3>Create New Room</h3>
          
          <div className="room-settings-form">
            <div className="setting">
              <label htmlFor="maxPlayers">Max Players:</label>
              <select
                id="maxPlayers"
                value={roomSettings.maxPlayers}
                onChange={(e) => setRoomSettings(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
              </select>
            </div>

            <div className="setting">
              <label htmlFor="roundCount">Number of Rounds:</label>
              <select
                id="roundCount"
                value={roomSettings.roundCount}
                onChange={(e) => setRoomSettings(prev => ({ ...prev, roundCount: parseInt(e.target.value) }))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="setting">
              <label htmlFor="timeLimit">Time per Question (seconds):</label>
              <select
                id="timeLimit"
                value={roomSettings.timeLimit}
                onChange={(e) => setRoomSettings(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
              >
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={45}>45</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleCreateRoom}
            disabled={isCreatingRoom}
            className="create-room-button"
          >
            {isCreatingRoom ? 'Creating...' : 'Create Room'}
          </button>
        </div>

        <div className="join-room-section">
          <h3>Join Existing Room</h3>
          
          <div className="join-room-form">
            <label htmlFor="roomId">Room ID:</label>
            <input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Enter room ID"
              maxLength={8}
            />
          </div>

          <button 
            onClick={handleJoinRoom}
            disabled={isJoiningRoom}
            className="join-room-button"
          >
            {isJoiningRoom ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default RoomLobby;