# Flag Guessing Game

A web-based flag guessing game with multiple game modes including single-player progression, time attack, and real-time multiplayer competitions.

## Project Structure

```
flag-guessing-game/
├── frontend/          # React frontend with TypeScript and Vite
├── backend/           # Node.js backend with Express and TypeScript
├── package.json       # Root package.json for workspace management
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (for production)
- Redis (for caching and real-time features)

## Quick Start

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your actual database and Redis credentials
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend on http://localhost:3500
   - Backend on http://localhost:3001

## Development Commands

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the frontend development server
- `npm run dev:backend` - Start only the backend development server
- `npm run build` - Build both frontend and backend for production
- `npm run lint` - Run ESLint on both frontend and backend

## Game Modes

- **Single Player**: Progressive difficulty with increasing choice options
- **Time Attack**: 60-second challenge with leaderboards
- **Multiplayer**: Real-time competitive gameplay in rooms

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Socket.io-client for real-time features
- React Router for navigation

### Backend
- Node.js with Express and TypeScript
- Socket.io for WebSocket connections
- PostgreSQL for persistent data
- Redis for caching and real-time state
- JWT for authentication

## Next Steps

After setting up the project structure, you can continue with the implementation tasks:

1. Implement database schema and models
2. Create flag data management system
3. Build core game logic service
4. Develop REST API endpoints
5. Implement WebSocket server for real-time features
6. Create React frontend components

See the tasks.md file in the specs directory for detailed implementation steps.