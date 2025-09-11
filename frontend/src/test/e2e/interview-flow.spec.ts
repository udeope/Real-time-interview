import { test, expect } from '@playwright/test';

test.describe('Interview Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
          token: 'mock-jwt-token',
        }),
      });
    });

    // Mock WebSocket connection
    await page.addInitScript(() => {
      // Mock Socket.IO
      (window as any).io = () => ({
        on: () => {},
        emit: () => {},
        disconnect: () => {},
        connected: true,
      });
    });

    await page.goto('/');
  });

  test('should complete full interview session flow', async ({ page }) => {
    // 1. Navigate to interview page
    await page.click('[data-testid="start-interview-btn"]');
    await expect(page).toHaveURL('/interview');

    // 2. Set up interview session
    await page.fill('[data-testid="job-title-input"]', 'Senior Frontend Developer');
    await page.fill('[data-testid="company-input"]', 'Tech Corp');
    await page.click('[data-testid="start-session-btn"]');

    // 3. Wait for audio setup
    await expect(page.locator('[data-testid="audio-status"]')).toContainText('Ready');

    // 4. Mock audio capture and transcription
    await page.evaluate(() => {
      // Mock getUserMedia
      (navigator as any).mediaDevices = {
        getUserMedia: () => Promise.resolve(new MediaStream()),
        enumerateDevices: () => Promise.resolve([
          { deviceId: 'default', kind: 'audioinput', label: 'Default Microphone' }
        ]),
      };
    });

    // 5. Start audio capture
    await page.click('[data-testid="start-audio-btn"]');
    await expect(page.locator('[data-testid="audio-status"]')).toContainText('Listening');

    // 6. Simulate receiving transcription
    await page.evaluate(() => {
      const event = new CustomEvent('transcription-received', {
        detail: {
          text: 'Tell me about your experience with React',
          confidence: 0.95,
          isFinal: true,
        },
      });
      window.dispatchEvent(event);
    });

    // 7. Verify transcription display
    await expect(page.locator('[data-testid="transcription-text"]'))
      .toContainText('Tell me about your experience with React');

    // 8. Verify response suggestions appear
    await expect(page.locator('[data-testid="response-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-option-0"]')).toBeVisible();

    // 9. Select and copy response
    await page.click('[data-testid="copy-response-0"]');
    await expect(page.locator('[data-testid="copy-success-message"]')).toBeVisible();

    // 10. Rate the response
    await page.click('[data-testid="rate-response-5"]');

    // 11. End session
    await page.click('[data-testid="end-session-btn"]');
    await expect(page.locator('[data-testid="session-summary"]')).toBeVisible();
  });

  test('should handle audio permission errors gracefully', async ({ page }) => {
    await page.goto('/interview');

    // Mock permission denied
    await page.evaluate(() => {
      (navigator as any).mediaDevices = {
        getUserMedia: () => Promise.reject(new Error('Permission denied')),
      };
    });

    await page.click('[data-testid="start-audio-btn"]');

    // Should show error message and fallback options
    await expect(page.locator('[data-testid="audio-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="fallback-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="manual-input-option"]')).toBeVisible();
  });

  test('should display real-time transcription updates', async ({ page }) => {
    await page.goto('/interview');
    
    // Start session
    await page.fill('[data-testid="job-title-input"]', 'Developer');
    await page.click('[data-testid="start-session-btn"]');

    // Mock progressive transcription
    const transcriptionUpdates = [
      { text: 'Tell me', confidence: 0.7, isFinal: false },
      { text: 'Tell me about', confidence: 0.8, isFinal: false },
      { text: 'Tell me about your', confidence: 0.85, isFinal: false },
      { text: 'Tell me about your experience', confidence: 0.95, isFinal: true },
    ];

    for (const update of transcriptionUpdates) {
      await page.evaluate((data) => {
        const event = new CustomEvent('transcription-update', { detail: data });
        window.dispatchEvent(event);
      }, update);

      await expect(page.locator('[data-testid="transcription-text"]'))
        .toContainText(update.text);

      if (!update.isFinal) {
        await expect(page.locator('[data-testid="transcription-status"]'))
          .toContainText('Listening...');
      }
    }

    // Final transcription should trigger response generation
    await expect(page.locator('[data-testid="response-suggestions"]')).toBeVisible();
  });

  test('should handle different question types appropriately', async ({ page }) => {
    await page.goto('/interview');
    await page.fill('[data-testid="job-title-input"]', 'Senior Developer');
    await page.click('[data-testid="start-session-btn"]');

    const questionTypes = [
      {
        question: 'What is your experience with JavaScript?',
        expectedType: 'technical',
        expectedStructure: 'direct',
      },
      {
        question: 'Tell me about a time you solved a difficult problem',
        expectedType: 'behavioral',
        expectedStructure: 'STAR',
      },
      {
        question: 'How would you handle a disagreement with a colleague?',
        expectedType: 'situational',
        expectedStructure: 'direct',
      },
    ];

    for (const testCase of questionTypes) {
      // Simulate transcription
      await page.evaluate((question) => {
        const event = new CustomEvent('transcription-received', {
          detail: { text: question, confidence: 0.95, isFinal: true },
        });
        window.dispatchEvent(event);
      }, testCase.question);

      // Wait for response generation
      await expect(page.locator('[data-testid="response-suggestions"]')).toBeVisible();

      // Check question type indicator
      await expect(page.locator('[data-testid="question-type"]'))
        .toContainText(testCase.expectedType);

      // Check response structure
      if (testCase.expectedStructure === 'STAR') {
        await expect(page.locator('[data-testid="star-response"]')).toBeVisible();
      }

      // Clear for next test
      await page.click('[data-testid="clear-transcription"]');
    }
  });

  test('should maintain session state across page refreshes', async ({ page }) => {
    await page.goto('/interview');
    
    // Start session
    await page.fill('[data-testid="job-title-input"]', 'Full Stack Developer');
    await page.click('[data-testid="start-session-btn"]');

    // Get session ID
    const sessionId = await page.locator('[data-testid="session-id"]').textContent();

    // Refresh page
    await page.reload();

    // Should restore session
    await expect(page.locator('[data-testid="session-restored"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-id"]')).toContainText(sessionId!);
  });

  test('should handle WebSocket connection issues', async ({ page }) => {
    await page.goto('/interview');

    // Mock WebSocket connection failure
    await page.evaluate(() => {
      (window as any).io = () => ({
        on: () => {},
        emit: () => {},
        disconnect: () => {},
        connected: false,
      });
    });

    await page.click('[data-testid="start-session-btn"]');

    // Should show connection error
    await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-connection-btn"]')).toBeVisible();

    // Test retry functionality
    await page.click('[data-testid="retry-connection-btn"]');
    await expect(page.locator('[data-testid="connecting-status"]')).toBeVisible();
  });

  test('should provide accessibility features', async ({ page }) => {
    await page.goto('/interview');

    // Check for proper ARIA labels
    await expect(page.locator('[aria-label="Start interview session"]')).toBeVisible();
    await expect(page.locator('[aria-label="Audio capture status"]')).toBeVisible();

    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'job-title-input');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'company-input');

    // Check screen reader announcements
    await page.fill('[data-testid="job-title-input"]', 'Developer');
    await expect(page.locator('[aria-live="polite"]')).toContainText('Job title updated');
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/interview');

    // Check mobile layout
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();

    // Check touch interactions
    await page.tap('[data-testid="start-session-btn"]');
    await expect(page.locator('[data-testid="session-started"]')).toBeVisible();

    // Check responsive panels
    await expect(page.locator('[data-testid="transcription-panel"]')).toHaveCSS('width', '100%');
    await expect(page.locator('[data-testid="response-panel"]')).toHaveCSS('width', '100%');
  });
});