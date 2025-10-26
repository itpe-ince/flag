#!/usr/bin/env node

/**
 * Comprehensive Integration Test Script
 * Tests all game modes end-to-end to ensure frontend-backend integration
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_PORT = 3501;
const FRONTEND_PORT = 3500;
const TEST_TIMEOUT = 60000; // 60 seconds

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, 'localhost');
  });
}

async function waitForPort(port, maxWait = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    if (await checkPort(port)) {
      return true;
    }
    await sleep(1000);
  }
  return false;
}

async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  try {
    const response = await fetch(url, {
      timeout: 10000,
      ...options
    });
    return {
      ok: response.ok,
      status: response.status,
      data: await response.json()
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

// Test functions
async function testDatabaseConnection() {
  logStep('DB', 'Testing database connection...');
  
  try {
    const response = await makeRequest(`http://localhost:${BACKEND_PORT}/api/health`);
    
    if (response.ok && response.data.status === 'OK') {
      logSuccess('Database connection verified');
      return true;
    } else {
      logError(`Database connection failed: ${response.data?.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Database connection test failed: ${error.message}`);
    return false;
  }
}

async function testAPIEndpoints() {
  logStep('API', 'Testing REST API endpoints...');
  
  const endpoints = [
    { path: '/api/health', method: 'GET', expectedStatus: 200 },
    { path: '/api/flags/random', method: 'GET', expectedStatus: 200 },
  ];
  
  let passed = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`http://localhost:${BACKEND_PORT}${endpoint.path}`, {
        method: endpoint.method
      });
      
      if (response.status === endpoint.expectedStatus) {
        logSuccess(`${endpoint.method} ${endpoint.path} - OK`);
        passed++;
      } else {
        logError(`${endpoint.method} ${endpoint.path} - Expected ${endpoint.expectedStatus}, got ${response.status}`);
      }
    } catch (error) {
      logError(`${endpoint.method} ${endpoint.path} - ${error.message}`);
    }
  }
  
  const success = passed === endpoints.length;
  if (success) {
    logSuccess(`All ${endpoints.length} API endpoints working`);
  } else {
    logError(`${endpoints.length - passed} API endpoints failed`);
  }
  
  return success;
}

async function testGameCreation() {
  logStep('GAME', 'Testing game creation flow...');
  
  try {
    // Test single player game creation
    const gameResponse = await makeRequest(`http://localhost:${BACKEND_PORT}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'single',
        createdBy: 'test-user-id',
        settings: { difficultyProgression: true }
      })
    });
    
    if (!gameResponse.ok) {
      logError(`Game creation failed: ${gameResponse.data?.error?.message || 'Unknown error'}`);
      return false;
    }
    
    const gameId = gameResponse.data.data.id;
    logSuccess(`Game created with ID: ${gameId}`);
    
    // Test game start
    const startResponse = await makeRequest(`http://localhost:${BACKEND_PORT}/api/games/${gameId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!startResponse.ok) {
      logError(`Game start failed: ${startResponse.data?.error?.message || 'Unknown error'}`);
      return false;
    }
    
    logSuccess('Game started successfully');
    
    // Test question generation
    const questionResponse = await makeRequest(`http://localhost:${BACKEND_PORT}/api/games/${gameId}/question?round=1&level=1`);
    
    if (!questionResponse.ok) {
      logError(`Question generation failed: ${questionResponse.data?.error?.message || 'Unknown error'}`);
      return false;
    }
    
    const question = questionResponse.data.data;
    if (!question.correctCountry || !question.choices || question.choices.length < 2) {
      logError('Invalid question structure');
      return false;
    }
    
    logSuccess(`Question generated with ${question.choices.length} choices`);
    
    // Test answer submission
    const answerResponse = await makeRequest(`http://localhost:${BACKEND_PORT}/api/games/${gameId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: question.id,
        userId: 'test-user-id',
        selectedChoice: 0,
        responseTime: 15,
        question: question
      })
    });
    
    if (!answerResponse.ok) {
      logError(`Answer submission failed: ${answerResponse.data?.error?.message || 'Unknown error'}`);
      return false;
    }
    
    logSuccess('Answer processed successfully');
    return true;
    
  } catch (error) {
    logError(`Game creation test failed: ${error.message}`);
    return false;
  }
}

async function testWebSocketConnection() {
  logStep('WS', 'Testing WebSocket connection...');
  
  try {
    const { io } = await import('socket.io-client');
    
    return new Promise((resolve) => {
      const socket = io(`http://localhost:${BACKEND_PORT}`, {
        timeout: 5000,
        forceNew: true
      });
      
      const timeout = setTimeout(() => {
        socket.disconnect();
        logError('WebSocket connection timeout');
        resolve(false);
      }, 10000);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        logSuccess('WebSocket connected successfully');
        
        // Test room creation
        socket.emit('create_room', {
          settings: {
            maxPlayers: 4,
            roundCount: 10,
            timePerQuestion: 30
          }
        }, (response) => {
          if (response.success) {
            logSuccess(`Room created: ${response.room.id}`);
            socket.disconnect();
            resolve(true);
          } else {
            logError(`Room creation failed: ${response.error}`);
            socket.disconnect();
            resolve(false);
          }
        });
      });
      
      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        logError(`WebSocket connection failed: ${error.message}`);
        resolve(false);
      });
    });
  } catch (error) {
    logError(`WebSocket test failed: ${error.message}`);
    return false;
  }
}

async function testFrontendBuild() {
  logStep('BUILD', 'Testing frontend build...');
  
  return new Promise((resolve) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    buildProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    buildProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Frontend build completed successfully');
        
        // Check if dist directory exists
        const distPath = path.join(__dirname, 'frontend', 'dist');
        if (fs.existsSync(distPath)) {
          logSuccess('Build artifacts created');
          resolve(true);
        } else {
          logError('Build artifacts not found');
          resolve(false);
        }
      } else {
        logError(`Frontend build failed with code ${code}`);
        if (errorOutput) {
          console.log('Build errors:', errorOutput);
        }
        resolve(false);
      }
    });
    
    // Timeout after 2 minutes
    setTimeout(() => {
      buildProcess.kill();
      logError('Frontend build timeout');
      resolve(false);
    }, 120000);
  });
}

async function testBackendBuild() {
  logStep('BUILD', 'Testing backend build...');
  
  return new Promise((resolve) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    buildProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    buildProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Backend build completed successfully');
        
        // Check if dist directory exists
        const distPath = path.join(__dirname, 'backend', 'dist');
        if (fs.existsSync(distPath)) {
          logSuccess('Build artifacts created');
          resolve(true);
        } else {
          logError('Build artifacts not found');
          resolve(false);
        }
      } else {
        logError(`Backend build failed with code ${code}`);
        if (errorOutput) {
          console.log('Build errors:', errorOutput);
        }
        resolve(false);
      }
    });
    
    // Timeout after 2 minutes
    setTimeout(() => {
      buildProcess.kill();
      logError('Backend build timeout');
      resolve(false);
    }, 120000);
  });
}

async function runExistingTests() {
  logStep('TEST', 'Running existing test suites...');
  
  // Run backend tests
  const backendTestResult = await new Promise((resolve) => {
    const testProcess = spawn('npm', ['test'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe'
    });
    
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Backend tests passed');
        resolve(true);
      } else {
        logError('Backend tests failed');
        console.log('Test output:', output);
        resolve(false);
      }
    });
    
    // Timeout after 2 minutes
    setTimeout(() => {
      testProcess.kill();
      logError('Backend tests timeout');
      resolve(false);
    }, 120000);
  });
  
  return backendTestResult;
}

// Main test runner
async function runIntegrationTests() {
  log('🚀 Starting Comprehensive Integration Tests', 'magenta');
  log('=' * 50, 'blue');
  
  const results = {
    databaseConnection: false,
    apiEndpoints: false,
    gameCreation: false,
    webSocketConnection: false,
    frontendBuild: false,
    backendBuild: false,
    existingTests: false
  };
  
  // Check if servers are running
  logStep('INIT', 'Checking server availability...');
  
  const backendRunning = await checkPort(BACKEND_PORT);
  const frontendRunning = await checkPort(FRONTEND_PORT);
  
  if (!backendRunning) {
    logWarning(`Backend not running on port ${BACKEND_PORT}`);
    logWarning('Please start the backend server: npm run dev (in backend directory)');
  } else {
    logSuccess(`Backend server detected on port ${BACKEND_PORT}`);
  }
  
  if (!frontendRunning) {
    logWarning(`Frontend not running on port ${FRONTEND_PORT}`);
    logWarning('Please start the frontend server: npm run dev (in frontend directory)');
  } else {
    logSuccess(`Frontend server detected on port ${FRONTEND_PORT}`);
  }
  
  // Run tests that don't require running servers
  log('\n📦 Testing Build Processes', 'blue');
  results.backendBuild = await testBackendBuild();
  results.frontendBuild = await testFrontendBuild();
  
  // Run existing test suites
  log('\n🧪 Running Existing Tests', 'blue');
  results.existingTests = await runExistingTests();
  
  // Run integration tests if backend is available
  if (backendRunning) {
    log('\n🔗 Testing Backend Integration', 'blue');
    results.databaseConnection = await testDatabaseConnection();
    results.apiEndpoints = await testAPIEndpoints();
    results.gameCreation = await testGameCreation();
    results.webSocketConnection = await testWebSocketConnection();
  } else {
    logWarning('Skipping backend integration tests - server not running');
  }
  
  // Summary
  log('\n📊 Test Results Summary', 'magenta');
  log('=' * 50, 'blue');
  
  const testCategories = [
    { name: 'Database Connection', key: 'databaseConnection', required: backendRunning },
    { name: 'API Endpoints', key: 'apiEndpoints', required: backendRunning },
    { name: 'Game Creation Flow', key: 'gameCreation', required: backendRunning },
    { name: 'WebSocket Connection', key: 'webSocketConnection', required: backendRunning },
    { name: 'Frontend Build', key: 'frontendBuild', required: true },
    { name: 'Backend Build', key: 'backendBuild', required: true },
    { name: 'Existing Tests', key: 'existingTests', required: true }
  ];
  
  let passed = 0;
  let total = 0;
  
  testCategories.forEach(category => {
    if (category.required) {
      total++;
      if (results[category.key]) {
        logSuccess(category.name);
        passed++;
      } else {
        logError(category.name);
      }
    } else {
      log(`⏭️  ${category.name} (Skipped - server not running)`, 'yellow');
    }
  });
  
  log('\n' + '=' * 50, 'blue');
  
  if (passed === total) {
    log(`🎉 All tests passed! (${passed}/${total})`, 'green');
    
    if (backendRunning && frontendRunning) {
      log('\n✅ Integration Status: READY FOR PRODUCTION', 'green');
      log('All components are properly integrated and working together.', 'green');
    } else {
      log('\n⚠️  Integration Status: PARTIALLY TESTED', 'yellow');
      log('Start both servers to run complete integration tests.', 'yellow');
    }
  } else {
    log(`❌ ${total - passed} tests failed! (${passed}/${total})`, 'red');
    log('\n🔧 Integration Status: NEEDS ATTENTION', 'red');
    log('Please fix the failing tests before deployment.', 'red');
  }
  
  // Recommendations
  log('\n💡 Next Steps:', 'cyan');
  
  if (!backendRunning || !frontendRunning) {
    log('1. Start both servers to run complete integration tests', 'cyan');
    log('   Backend: cd backend && npm run dev', 'cyan');
    log('   Frontend: cd frontend && npm run dev', 'cyan');
  }
  
  if (results.backendBuild && results.frontendBuild) {
    log('2. Build processes are working - ready for deployment setup', 'cyan');
  } else {
    log('2. Fix build issues before proceeding to deployment', 'cyan');
  }
  
  if (passed === total && backendRunning && frontendRunning) {
    log('3. All integration tests passed - proceed to task 13.2 (deployment setup)', 'cyan');
  } else {
    log('3. Fix integration issues before deployment setup', 'cyan');
  }
  
  return passed === total;
}

// Run the tests
if (require.main === module) {
  runIntegrationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Integration test runner failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };