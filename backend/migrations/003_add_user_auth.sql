-- Add authentication fields to users table
-- Migration: 003_add_user_auth

-- Add email and password fields to users table
ALTER TABLE users 
ADD COLUMN email VARCHAR(255) UNIQUE,
ADD COLUMN password_hash VARCHAR(255);

-- Create index for email lookups
CREATE INDEX idx_users_email ON users(email);

-- Update existing users to have placeholder email (for development)
-- In production, this would need to be handled differently
UPDATE users 
SET email = username || '@placeholder.com', 
    password_hash = '$2a$10$placeholder.hash.for.existing.users'
WHERE email IS NULL;

-- Make email and password_hash NOT NULL after updating existing records
ALTER TABLE users 
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN password_hash SET NOT NULL;