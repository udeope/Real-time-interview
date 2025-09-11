import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-browser compatibility testing configuration
 */
export default defineConfig({
  testDir: './src/test/cross-browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results/cross-browser-results.json' }]],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop browsers
    {
      name: 'Chrome Latest',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'Chrome Previous',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome-beta',
      },
    },
    {
      name: 'Firefox Latest',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Safari Latest',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Edge Latest',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome Android',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari iOS',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Mobile Safari iPad',
      use: { ...devices['iPad Pro'] },
    },

    // Different screen sizes
    {
      name: 'Desktop 1920x1080',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Desktop 1366x768',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'Tablet Portrait',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});