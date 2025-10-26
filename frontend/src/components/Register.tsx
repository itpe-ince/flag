import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RegisterCredentials } from '../types';
import './Register.css';

interface RegisterProps {
  onSwitchToLogin: () => void;
  onClose?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin, onClose }) => {
  const { register, isLoading } = useAuth();
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    username: '',
    email: '',
    password: '',
    avatarUrl: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!credentials.username || !credentials.email || !credentials.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (credentials.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (credentials.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (credentials.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    // Remove avatarUrl if empty
    const registrationData = {
      ...credentials,
      avatarUrl: credentials.avatarUrl || undefined,
    };

    const result = await register(registrationData);
    if (result.success) {
      onClose?.();
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setCredentials(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h2>Join Flag Guessing Game</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username: *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              placeholder="Choose a username"
              minLength={3}
              maxLength={50}
              pattern="[a-zA-Z0-9_-]+"
              title="Username can only contain letters, numbers, underscores, and hyphens"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email: *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password: *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              placeholder="Create a password"
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password: *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              placeholder="Confirm your password"
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="avatarUrl">Avatar URL (optional):</label>
            <input
              type="url"
              id="avatarUrl"
              name="avatarUrl"
              value={credentials.avatarUrl}
              onChange={handleInputChange}
              disabled={isLoading}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
          
          <button 
            type="submit" 
            className="register-button"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-switch">
          <p>
            Already have an account?{' '}
            <button 
              type="button" 
              className="link-button"
              onClick={onSwitchToLogin}
              disabled={isLoading}
            >
              Login here
            </button>
          </p>
        </div>
        
        {onClose && (
          <button 
            type="button" 
            className="close-button"
            onClick={onClose}
            disabled={isLoading}
          >
            Continue as Guest
          </button>
        )}
      </div>
    </div>
  );
};

export default Register;