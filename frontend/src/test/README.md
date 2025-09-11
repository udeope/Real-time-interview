# AI Interview Assistant - Frontend Testing Suite

This directory contains comprehensive tests for the AI Interview Assistant frontend application.

## Test Structure

```
src/test/
├── e2e/                     # End-to-end tests with Playwright
├── cross-browser/           # Cross-browser compatibility tests
├── performance/             # Frontend performance tests
├── unit/                    # Component and utility unit tests
├── integration/             # Frontend integration tests
├── setup.ts                 # General test setup
├── setup-performance.ts     # Performance test setup
└── README.md               # This file
```

## Test Types

### Unit Tests
- **Location**: Throughout `src/` directory (`.test.ts` files)
- **Purpose**: Test individual components, hooks, and utilities
- **Run**: `npm run test`
- **Framework**: Vitest + Testing Library

### Integration Tests
- **Location**: `src/test/integration/`
- **Purpose**: Test component interactions and data flow
- **Run**: `npm run test`
- **Focus**: WebSocket connections, API integrations, state management

### End-to-End Tests
- **Location**: `src/test/e2e/`
- **Purpose**: Test complete user workflows in real browser
- **Run**: `npm run test:e2e`
- **Framework**: Playwright
- **Scenarios**: Interview flow, audio capture, response selection

### Cross-Browser Tests
- **Location**: `src/test/cross-browser/`
- **Purpose**: Ensure compatibility across different browsers
- **Run**: `npm run test:cross-browser`
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Focus**: Audio APIs, WebRTC, CSS compatibility

### Performance Tests
- **Location**: `src/test/performance/`
- **Purpose**: Validate frontend performance metrics
- **Run**: `npm run test:performance`
- **Metrics**: Render times, memory usage, bundle size

## Running Tests

### All Tests
```bash
npm run test:all
```

### Individual Test Suites
```bash
# Unit and integration tests
npm run test

# End-to-end tests
npm run test:e2e

# Cross-browser tests
npm run test:cross-browser

# Performance tests
npm run test:performance
```

### Test Options
```bash
# Watch mode
npm run test:watch

# UI mode (interactive)
npm run test:ui

# E2E with UI
npm run test:e2e:ui
```

## Browser Support

### Desktop Browsers
- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions

### Mobile Browsers
- **Mobile Chrome**: Android 8+
- **Mobile Safari**: iOS 12+

### Feature Detection
Tests verify support for:
- Web Audio API
- getUserMedia
- WebRTC
- WebSocket
- ES6+ features
- CSS Grid/Flexbox

## Performance Requirements

### Component Rendering
- **Initial Render**: <100ms for simple components
- **Complex Components**: <200ms for interview session
- **Re-renders**: <50ms for prop updates
- **List Rendering**: <500ms for 100+ items

### Memory Usage
- **Component Lifecycle**: No memory leaks
- **Event Listeners**: Proper cleanup
- **Bundle Size**: <2MB total, <500KB initial

### Audio Performance
- **Capture Latency**: <100ms from user action
- **Processing**: <200ms for audio format conversion
- **Streaming**: Maintain real-time performance

## Test Configuration

### Vitest Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### Playwright Configuration
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

## Writing Tests

### Component Unit Test
```typescript
import { render, screen } from '@testing-library/react';
import { TranscriptionPanel } from './TranscriptionPanel';

describe('TranscriptionPanel', () => {
  it('should display transcription text', () => {
    render(
      <TranscriptionPanel 
        transcription="Test transcription"
        isListening={false}
        confidence={0.95}
      />
    );
    
    expect(screen.getByText('Test transcription')).toBeInTheDocument();
  });
});
```

### E2E Test
```typescript
import { test, expect } from '@playwright/test';

test('should complete interview flow', async ({ page }) => {
  await page.goto('/interview');
  
  await page.fill('[data-testid="job-title"]', 'Developer');
  await page.click('[data-testid="start-session"]');
  
  await expect(page.locator('[data-testid="session-active"]')).toBeVisible();
});
```

### Performance Test
```typescript
import { PerformanceTimer } from '../setup-performance';

describe('Component Performance', () => {
  it('should render quickly', () => {
    const timer = new PerformanceTimer();
    
    timer.start();
    render(<MyComponent />);
    const renderTime = timer.end();
    
    expect(renderTime).toBeLessThan(100);
  });
});
```

### Cross-Browser Test
```typescript
test('should work across browsers', async ({ page, browserName }) => {
  await page.goto('/interview');
  
  const hasAudioSupport = await page.evaluate(() => {
    return !!(navigator.mediaDevices?.getUserMedia);
  });
  
  if (browserName !== 'webkit') {
    expect(hasAudioSupport).toBe(true);
  }
});
```

## Mock Data and Fixtures

### Audio Mocking
```typescript
// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => 
      Promise.resolve(new MediaStream())
    ),
  },
});
```

### WebSocket Mocking
```typescript
// Mock Socket.IO
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));
```

### API Mocking
```typescript
// Mock fetch requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'mock data' }),
  })
);
```

## Accessibility Testing

### ARIA Labels
```typescript
test('should have proper ARIA labels', () => {
  render(<AudioCaptureButton />);
  
  expect(screen.getByLabelText('Start audio capture')).toBeInTheDocument();
});
```

### Keyboard Navigation
```typescript
test('should support keyboard navigation', async () => {
  render(<InterviewSession />);
  
  await user.keyboard.press('Tab');
  expect(screen.getByRole('button')).toHaveFocus();
});
```

### Screen Reader Support
```typescript
test('should announce status changes', () => {
  render(<TranscriptionPanel />);
  
  expect(screen.getByRole('status')).toHaveTextContent('Ready to listen');
});
```

## Visual Regression Testing

### Screenshot Testing
```typescript
test('should match visual snapshot', async ({ page }) => {
  await page.goto('/interview');
  await expect(page).toHaveScreenshot('interview-page.png');
});
```

### Responsive Design
```typescript
test('should work on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/interview');
  
  await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
});
```

## Continuous Integration

### GitHub Actions
```yaml
- name: Run Frontend Tests
  run: |
    npm run test
    npm run test:e2e
    npm run test:cross-browser
```

### Test Reports
- **Coverage**: `coverage/lcov-report/index.html`
- **E2E Results**: `playwright-report/index.html`
- **Performance**: `test-results/performance.json`

## Debugging Tests

### Debug Mode
```bash
# Debug specific test
npm run test -- --reporter=verbose MyComponent

# Debug E2E test
npm run test:e2e:ui
```

### Browser DevTools
```typescript
test('debug test', async ({ page }) => {
  await page.pause(); // Opens browser with DevTools
});
```

### Console Logs
```typescript
test('with logs', async ({ page }) => {
  page.on('console', msg => console.log(msg.text()));
});
```

## Common Issues

### Flaky Tests
- Use `waitFor` for async operations
- Mock time-dependent functions
- Ensure test isolation

### Performance Variations
- Run tests multiple times
- Use performance budgets
- Monitor CI environment

### Browser Compatibility
- Check feature support
- Provide fallbacks
- Test on real devices

## Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Test Data
- Use factories for test data
- Keep tests independent
- Clean up after tests

### Assertions
- Use specific matchers
- Test behavior, not implementation
- Include negative test cases

### Performance
- Avoid unnecessary renders
- Mock heavy operations
- Use shallow rendering when appropriate

## Contributing

### Adding Tests
1. Follow existing patterns and conventions
2. Include both positive and negative cases
3. Add performance tests for new features
4. Update documentation

### Test Guidelines
- Write tests before or alongside code
- Aim for high coverage but focus on critical paths
- Test user interactions, not implementation details
- Keep tests simple and focused