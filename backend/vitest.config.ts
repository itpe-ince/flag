import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    globals: true,
    setupFiles: ['./src/test/setup.ts']
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
});