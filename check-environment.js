#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * Validates that all required environment variables and dependencies are properly configured
 */

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

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Read and parse JSON file
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Read environment file
function readEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    return env;
  } catch (error) {
    return null;
  }
}

// Check backend configuration
function checkBackendConfig() {
  log('\n🔧 Checking Backend Configuration', 'magenta');
  
  let issues = 0;
  
  // Check package.json
  const backendPackagePath = path.join(__dirname, 'backend', 'package.json');
  if (fileExists(backendPackagePath)) {
    logSuccess('Backend package.json found');
    
    const packageJson = readJsonFile(backendPackagePath);
    if (packageJson) {
      // Check required dependencies
      const requiredDeps = [
        'express', 'cors', 'dotenv', 'pg', 'redis', 'socket.io',
        'jsonwebtoken', 'bcryptjs', 'uuid', 'zod'
      ];
      
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      requiredDeps.forEach(dep => {
        if (dependencies[dep]) {
          logSuccess(`Dependency ${dep} found (${dependencies[dep]})`);
        } else {
          logError(`Missing dependency: ${dep}`);
          issues++;
        }
      });
      
      // Check scripts
      const requiredScripts = ['dev', 'build', 'start', 'migrate', 'seed:flags'];
      requiredScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          logSuccess(`Script ${script} configured`);
        } else {
          logError(`Missing script: ${script}`);
          issues++;
        }
      });
    } else {
      logError('Failed to parse backend package.json');
      issues++;
    }
  } else {
    logError('Backend package.json not found');
    issues++;
  }
  
  // Check .env file
  const envPath = path.join(__dirname, 'backend', '.env');
  if (fileExists(envPath)) {
    logSuccess('Backend .env file found');
    
    const env = readEnvFile(envPath);
    if (env) {
      const requiredEnvVars = [
        'PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
        'REDIS_URL', 'JWT_SECRET', 'FRONTEND_URL', 'CDN_BASE_URL'
      ];
      
      requiredEnvVars.forEach(varName => {
        if (env[varName]) {
          logSuccess(`Environment variable ${varName} set`);
        } else {
          logError(`Missing environment variable: ${varName}`);
          issues++;
        }
      });
      
      // Check for development vs production settings
      if (env.NODE_ENV === 'production') {
        if (env.JWT_SECRET === 'dev-secret-key-change-in-production') {
          logError('Using development JWT secret in production!');
          issues++;
        }
      }
    } else {
      logError('Failed to parse backend .env file');
      issues++;
    }
  } else {
    logError('Backend .env file not found');
    logInfo('Copy backend/.env.example to backend/.env and configure');
    issues++;
  }
  
  // Check TypeScript configuration
  const tsconfigPath = path.join(__dirname, 'backend', 'tsconfig.json');
  if (fileExists(tsconfigPath)) {
    logSuccess('Backend TypeScript configuration found');
  } else {
    logError('Backend tsconfig.json not found');
    issues++;
  }
  
  // Check source directory structure
  const srcPath = path.join(__dirname, 'backend', 'src');
  if (fileExists(srcPath)) {
    logSuccess('Backend source directory found');
    
    const requiredDirs = ['config', 'routes', 'services', 'middleware', 'models', 'types', 'utils'];
    requiredDirs.forEach(dir => {
      const dirPath = path.join(srcPath, dir);
      if (fileExists(dirPath)) {
        logSuccess(`Source directory ${dir} found`);
      } else {
        logWarning(`Source directory ${dir} not found`);
      }
    });
  } else {
    logError('Backend source directory not found');
    issues++;
  }
  
  return issues;
}

// Check frontend configuration
function checkFrontendConfig() {
  log('\n⚛️ Checking Frontend Configuration', 'magenta');
  
  let issues = 0;
  
  // Check package.json
  const frontendPackagePath = path.join(__dirname, 'frontend', 'package.json');
  if (fileExists(frontendPackagePath)) {
    logSuccess('Frontend package.json found');
    
    const packageJson = readJsonFile(frontendPackagePath);
    if (packageJson) {
      // Check required dependencies
      const requiredDeps = [
        'react', 'react-dom', 'socket.io-client', 'react-router-dom'
      ];
      
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      requiredDeps.forEach(dep => {
        if (dependencies[dep]) {
          logSuccess(`Dependency ${dep} found (${dependencies[dep]})`);
        } else {
          logError(`Missing dependency: ${dep}`);
          issues++;
        }
      });
      
      // Check scripts
      const requiredScripts = ['dev', 'build', 'preview'];
      requiredScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          logSuccess(`Script ${script} configured`);
        } else {
          logError(`Missing script: ${script}`);
          issues++;
        }
      });
    } else {
      logError('Failed to parse frontend package.json');
      issues++;
    }
  } else {
    logError('Frontend package.json not found');
    issues++;
  }
  
  // Check Vite configuration
  const viteConfigPath = path.join(__dirname, 'frontend', 'vite.config.ts');
  if (fileExists(viteConfigPath)) {
    logSuccess('Vite configuration found');
  } else {
    logError('Vite configuration not found');
    issues++;
  }
  
  // Check TypeScript configuration
  const tsconfigPath = path.join(__dirname, 'frontend', 'tsconfig.json');
  if (fileExists(tsconfigPath)) {
    logSuccess('Frontend TypeScript configuration found');
  } else {
    logError('Frontend tsconfig.json not found');
    issues++;
  }
  
  // Check source directory structure
  const srcPath = path.join(__dirname, 'frontend', 'src');
  if (fileExists(srcPath)) {
    logSuccess('Frontend source directory found');
    
    const requiredDirs = ['components', 'services', 'contexts', 'types', 'hooks'];
    requiredDirs.forEach(dir => {
      const dirPath = path.join(srcPath, dir);
      if (fileExists(dirPath)) {
        logSuccess(`Source directory ${dir} found`);
      } else {
        logWarning(`Source directory ${dir} not found`);
      }
    });
    
    // Check for main entry files
    const entryFiles = ['main.tsx', 'App.tsx', 'index.css'];
    entryFiles.forEach(file => {
      const filePath = path.join(srcPath, file);
      if (fileExists(filePath)) {
        logSuccess(`Entry file ${file} found`);
      } else {
        logError(`Entry file ${file} not found`);
        issues++;
      }
    });
  } else {
    logError('Frontend source directory not found');
    issues++;
  }
  
  return issues;
}

// Check database configuration
function checkDatabaseConfig() {
  log('\n🗄️ Checking Database Configuration', 'magenta');
  
  let issues = 0;
  
  // Check migration files
  const migrationsPath = path.join(__dirname, 'backend', 'migrations');
  if (fileExists(migrationsPath)) {
    logSuccess('Migrations directory found');
    
    const migrationFiles = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
    if (migrationFiles.length > 0) {
      logSuccess(`Found ${migrationFiles.length} migration files`);
      migrationFiles.forEach(file => {
        logInfo(`  - ${file}`);
      });
    } else {
      logError('No migration files found');
      issues++;
    }
  } else {
    logError('Migrations directory not found');
    issues++;
  }
  
  // Check database configuration file
  const dbConfigPath = path.join(__dirname, 'backend', 'src', 'config', 'database.ts');
  if (fileExists(dbConfigPath)) {
    logSuccess('Database configuration file found');
  } else {
    logError('Database configuration file not found');
    issues++;
  }
  
  // Check Redis configuration file
  const redisConfigPath = path.join(__dirname, 'backend', 'src', 'config', 'redis.ts');
  if (fileExists(redisConfigPath)) {
    logSuccess('Redis configuration file found');
  } else {
    logError('Redis configuration file not found');
    issues++;
  }
  
  return issues;
}

// Check project structure
function checkProjectStructure() {
  log('\n📁 Checking Project Structure', 'magenta');
  
  let issues = 0;
  
  // Check root files
  const rootFiles = ['package.json', 'README.md', '.gitignore'];
  rootFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fileExists(filePath)) {
      logSuccess(`Root file ${file} found`);
    } else {
      logWarning(`Root file ${file} not found`);
    }
  });
  
  // Check main directories
  const mainDirs = ['backend', 'frontend'];
  mainDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fileExists(dirPath)) {
      logSuccess(`Main directory ${dir} found`);
    } else {
      logError(`Main directory ${dir} not found`);
      issues++;
    }
  });
  
  // Check spec directory
  const specPath = path.join(__dirname, '.kiro', 'specs', 'flag-guessing-game');
  if (fileExists(specPath)) {
    logSuccess('Spec directory found');
    
    const specFiles = ['requirements.md', 'design.md', 'tasks.md'];
    specFiles.forEach(file => {
      const filePath = path.join(specPath, file);
      if (fileExists(filePath)) {
        logSuccess(`Spec file ${file} found`);
      } else {
        logError(`Spec file ${file} not found`);
        issues++;
      }
    });
  } else {
    logError('Spec directory not found');
    issues++;
  }
  
  return issues;
}

// Main function
function checkEnvironment() {
  log('🔍 Environment Configuration Check', 'cyan');
  log('=' * 50, 'blue');
  
  let totalIssues = 0;
  
  totalIssues += checkProjectStructure();
  totalIssues += checkBackendConfig();
  totalIssues += checkFrontendConfig();
  totalIssues += checkDatabaseConfig();
  
  // Summary
  log('\n📊 Configuration Check Summary', 'magenta');
  log('=' * 50, 'blue');
  
  if (totalIssues === 0) {
    log('🎉 All configuration checks passed!', 'green');
    log('Your environment is properly configured for development and deployment.', 'green');
  } else {
    log(`❌ Found ${totalIssues} configuration issues`, 'red');
    log('Please fix these issues before proceeding with deployment.', 'red');
  }
  
  // Recommendations
  log('\n💡 Recommendations:', 'cyan');
  
  if (totalIssues === 0) {
    log('1. Run integration tests: node integration-test.js', 'cyan');
    log('2. Start development servers to test functionality', 'cyan');
    log('3. Proceed with deployment configuration (task 13.2)', 'cyan');
  } else {
    log('1. Fix the configuration issues listed above', 'cyan');
    log('2. Ensure all required dependencies are installed', 'cyan');
    log('3. Verify environment variables are properly set', 'cyan');
    log('4. Re-run this check after fixing issues', 'cyan');
  }
  
  return totalIssues === 0;
}

// Run the check
if (require.main === module) {
  const success = checkEnvironment();
  process.exit(success ? 0 : 1);
}

module.exports = { checkEnvironment };