#!/usr/bin/env node

/**
 * Simple Integration Test Script
 * Tests core functionality without complex WebSocket testing
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

// Test database migration
async function testDatabaseMigration() {
  log('\n🗄️ Testing Database Migration', 'magenta');
  
  return new Promise((resolve) => {
    const migrateProcess = spawn('npm', ['run', 'migrate'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    migrateProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    migrateProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    migrateProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Database migration completed successfully');
        resolve(true);
      } else {
        logError(`Database migration failed with code ${code}`);
        if (errorOutput) {
          console.log('Migration errors:', errorOutput);
        }
        resolve(false);
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      migrateProcess.kill();
      logError('Database migration timeout');
      resolve(false);
    }, 30000);
  });
}

// Test flag seeding
async function testFlagSeeding() {
  log('\n🏁 Testing Flag Data Seeding', 'magenta');
  
  return new Promise((resolve) => {
    const seedProcess = spawn('npm', ['run', 'seed:flags'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    seedProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    seedProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    seedProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Flag data seeding completed successfully');
        resolve(true);
      } else {
        logError(`Flag data seeding failed with code ${code}`);
        if (errorOutput) {
          console.log('Seeding errors:', errorOutput);
        }
        resolve(false);
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      seedProcess.kill();
      logError('Flag data seeding timeout');
      resolve(false);
    }, 30000);
  });
}

// Test question generation
async function testQuestionGeneration() {
  log('\n❓ Testing Question Generation', 'magenta');
  
  return new Promise((resolve) => {
    const testProcess = spawn('npm', ['run', 'test:questions'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Question generation test completed successfully');
        if (output.includes('Generated question')) {
          logSuccess('Question generation is working correctly');
        }
        resolve(true);
      } else {
        logError(`Question generation test failed with code ${code}`);
        if (errorOutput) {
          console.log('Test errors:', errorOutput);
        }
        resolve(false);
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      testProcess.kill();
      logError('Question generation test timeout');
      resolve(false);
    }, 30000);
  });
}

// Test build processes
async function testBuilds() {
  log('\n📦 Testing Build Processes', 'magenta');
  
  // Test backend build
  const backendBuildResult = await new Promise((resolve) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe'
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Backend build completed successfully');
        resolve(true);
      } else {
        logError('Backend build failed');
        resolve(false);
      }
    });
    
    setTimeout(() => {
      buildProcess.kill();
      logError('Backend build timeout');
      resolve(false);
    }, 60000);
  });
  
  // Test frontend build
  const frontendBuildResult = await new Promise((resolve) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'pipe'
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Frontend build completed successfully');
        resolve(true);
      } else {
        logError('Frontend build failed');
        resolve(false);
      }
    });
    
    setTimeout(() => {
      buildProcess.kill();
      logError('Frontend build timeout');
      resolve(false);
    }, 60000);
  });
  
  return backendBuildResult && frontendBuildResult;
}

// Check file structure
function checkFileStructure() {
  log('\n📁 Checking File Structure', 'magenta');
  
  const criticalFiles = [
    'backend/src/index.ts',
    'backend/src/config/database.ts',
    'backend/src/config/redis.ts',
    'backend/src/services/game-service.ts',
    'backend/src/services/question-generator.ts',
    'backend/src/routes/games.ts',
    'backend/src/routes/flags.ts',
    'frontend/src/App.tsx',
    'frontend/src/main.tsx',
    'frontend/src/components/GameBoard.tsx',
    'frontend/src/components/SinglePlayerGame.tsx',
    'frontend/src/services/auth-service.ts'
  ];
  
  let allFilesExist = true;
  
  criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`Critical file ${file} exists`);
    } else {
      logError(`Critical file ${file} missing`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

// Check configuration files
function checkConfiguration() {
  log('\n⚙️ Checking Configuration', 'magenta');
  
  let configValid = true;
  
  // Check backend .env
  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  if (fs.existsSync(backendEnvPath)) {
    logSuccess('Backend .env file exists');
    
    const envContent = fs.readFileSync(backendEnvPath, 'utf8');
    const requiredVars = ['PORT', 'DB_HOST', 'DB_NAME', 'REDIS_URL', 'JWT_SECRET'];
    
    requiredVars.forEach(varName => {
      if (envContent.includes(`${varName}=`)) {
        logSuccess(`Environment variable ${varName} configured`);
      } else {
        logError(`Environment variable ${varName} missing`);
        configValid = false;
      }
    });
  } else {
    logError('Backend .env file missing');
    configValid = false;
  }
  
  // Check package.json files
  const backendPackagePath = path.join(__dirname, 'backend', 'package.json');
  const frontendPackagePath = path.join(__dirname, 'frontend', 'package.json');
  
  if (fs.existsSync(backendPackagePath)) {
    logSuccess('Backend package.json exists');
  } else {
    logError('Backend package.json missing');
    configValid = false;
  }
  
  if (fs.existsSync(frontendPackagePath)) {
    logSuccess('Frontend package.json exists');
  } else {
    logError('Frontend package.json missing');
    configValid = false;
  }
  
  return configValid;
}

// Main test function
async function runSimpleIntegrationTest() {
  log('🚀 Simple Integration Test', 'cyan');
  log('=' * 40, 'blue');
  
  const results = {
    fileStructure: false,
    configuration: false,
    builds: false,
    migration: false,
    seeding: false,
    questionGeneration: false
  };
  
  // Run tests
  results.fileStructure = checkFileStructure();
  results.configuration = checkConfiguration();
  results.builds = await testBuilds();
  
  // Only run database tests if basic structure is good
  if (results.fileStructure && results.configuration) {
    results.migration = await testDatabaseMigration();
    
    if (results.migration) {
      results.seeding = await testFlagSeeding();
      results.questionGeneration = await testQuestionGeneration();
    }
  }
  
  // Summary
  log('\n📊 Test Results Summary', 'magenta');
  log('=' * 40, 'blue');
  
  const testCategories = [
    { name: 'File Structure', key: 'fileStructure' },
    { name: 'Configuration', key: 'configuration' },
    { name: 'Build Processes', key: 'builds' },
    { name: 'Database Migration', key: 'migration' },
    { name: 'Flag Data Seeding', key: 'seeding' },
    { name: 'Question Generation', key: 'questionGeneration' }
  ];
  
  let passed = 0;
  let total = testCategories.length;
  
  testCategories.forEach(category => {
    if (results[category.key]) {
      logSuccess(category.name);
      passed++;
    } else {
      logError(category.name);
    }
  });
  
  log('\n' + '=' * 40, 'blue');
  
  if (passed === total) {
    log(`🎉 All tests passed! (${passed}/${total})`, 'green');
    log('✅ Core integration is working correctly', 'green');
  } else {
    log(`❌ ${total - passed} tests failed! (${passed}/${total})`, 'red');
    log('🔧 Some components need attention', 'red');
  }
  
  // Next steps
  log('\n💡 Next Steps:', 'cyan');
  
  if (passed === total) {
    log('1. Start development servers to test full functionality', 'cyan');
    log('   Backend: cd backend && npm run dev', 'cyan');
    log('   Frontend: cd frontend && npm run dev', 'cyan');
    log('2. Test game modes manually in the browser', 'cyan');
    log('3. Proceed to deployment configuration (task 13.2)', 'cyan');
  } else {
    log('1. Fix the failing components listed above', 'cyan');
    log('2. Ensure database and Redis are running', 'cyan');
    log('3. Re-run this test after fixing issues', 'cyan');
  }
  
  return passed === total;
}

// Run the test
if (require.main === module) {
  runSimpleIntegrationTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Integration test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runSimpleIntegrationTest };