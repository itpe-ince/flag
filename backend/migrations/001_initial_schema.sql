-- Initial database schema for Flag Guessing Game
-- Migration: 001_initial_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  total_games INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  highest_level INTEGER DEFAULT 0,
  total_score BIGINT DEFAULT 0
);

-- Countries/Flags table
CREATE TABLE flags (
  country_code VARCHAR(3) PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  region VARCHAR(50),
  colors TEXT[],
  difficulty_level INTEGER DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('single', 'timeattack', 'multiplayer')),
  settings JSONB,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- Game results table
CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  user_id UUID REFERENCES users(id),
  score INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  completion_time INTEGER, -- in seconds
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_games_created_by ON games(created_by);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_results_game_id ON game_results(game_id);
CREATE INDEX idx_game_results_user_id ON game_results(user_id);
CREATE INDEX idx_game_results_score ON game_results(score DESC);
CREATE INDEX idx_flags_region ON flags(region);
CREATE INDEX idx_flags_difficulty ON flags(difficulty_level);