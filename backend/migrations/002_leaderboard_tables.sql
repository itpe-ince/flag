-- Add leaderboard tables for scoring system
-- Migration: 002_leaderboard_tables

-- Leaderboard entries table for tracking scores across different timeframes
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score BIGINT NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL,
  timeframe VARCHAR(20) NOT NULL CHECK (timeframe IN ('daily', 'weekly', 'alltime')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one entry per user per date per timeframe
  UNIQUE(user_id, entry_date, timeframe)
);

-- Create indexes for leaderboard queries
CREATE INDEX idx_leaderboard_timeframe_score ON leaderboard_entries(timeframe, score DESC);
CREATE INDEX idx_leaderboard_user_timeframe ON leaderboard_entries(user_id, timeframe);
CREATE INDEX idx_leaderboard_date_timeframe ON leaderboard_entries(entry_date, timeframe);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_leaderboard_entries_updated_at 
    BEFORE UPDATE ON leaderboard_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();