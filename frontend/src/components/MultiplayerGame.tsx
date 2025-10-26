import React, { useState } from 'react';
import { Room } from '../types';
import RoomLobby from './RoomLobby';
import MultiplayerRoom from './MultiplayerRoom';
import { Socket } from 'socket.io-client';

interface MultiplayerGameProps {
  onBack: () => void;
}

type MultiplayerState = 'lobby' | 'playing' | 'finished';

const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<MultiplayerState>('lobby');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleGameStart = (room: Room) => {
    setCurrentRoom(room);
    setGameState('playing');
  };

  const handleGameEnd = (finalRoom: Room) => {
    setCurrentRoom(finalRoom);
    setGameState('finished');
    // Auto-return to lobby after showing results
    setTimeout(() => {
      setGameState('lobby');
      setCurrentRoom(null);
    }, 3000);
  };

  const handleLeaveRoom = () => {
    setGameState('lobby');
    setCurrentRoom(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const handleBackToMenu = () => {
    if (socket) {
      socket.disconnect();
    }
    onBack();
  };

  if (gameState === 'playing' && currentRoom && socket) {
    return (
      <MultiplayerRoom
        socket={socket}
        room={currentRoom}
        onGameEnd={handleGameEnd}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return (
    <RoomLobby
      onBack={handleBackToMenu}
      onGameStart={handleGameStart}
    />
  );
};

export default MultiplayerGame;