import { useEffect } from 'react';
import Router from './components/Router';
import { AuthProvider } from './contexts/AuthContext';
import { cacheService } from './services/cache-service';
import './App.css';

function App() {
  // Initialize cache service on app start
  useEffect(() => {
    const initializeCache = async () => {
      try {
        const initialized = await cacheService.initialize();
        if (initialized) {
          console.log('Cache service initialized successfully');
        } else {
          console.warn('Cache service initialization failed - running without caching');
        }
      } catch (error) {
        console.error('Failed to initialize cache service:', error);
      }
    };

    initializeCache();
  }, []);

  return (
    <AuthProvider>
      <div className="App">
        <Router />
      </div>
    </AuthProvider>
  );
}

export default App;