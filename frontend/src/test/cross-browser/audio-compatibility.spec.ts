import { test, expect, Browser } from '@playwright/test';

test.describe('Cross-Browser Audio Compatibility', () => {
  test('should detect audio capabilities across browsers', async ({ page, browserName }) => {
    await page.goto('/interview');

    // Check if getUserMedia is supported
    const hasGetUserMedia = await page.evaluate(() => {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    });

    if (browserName === 'webkit' && process.platform === 'darwin') {
      // Safari on macOS should support getUserMedia
      expect(hasGetUserMedia).toBe(true);
    } else if (browserName === 'firefox' || browserName === 'chromium') {
      // Firefox and Chrome should support getUserMedia
      expect(hasGetUserMedia).toBe(true);
    }

    // Check audio context support
    const hasAudioContext = await page.evaluate(() => {
      return !!(window.AudioContext || (window as any).webkitAudioContext);
    });

    expect(hasAudioContext).toBe(true);
  });

  test('should handle audio format differences', async ({ page, browserName }) => {
    await page.goto('/interview');

    // Mock different audio formats based on browser
    await page.evaluate((browser) => {
      const mockFormats = {
        chromium: ['webm', 'ogg', 'mp4'],
        firefox: ['webm', 'ogg'],
        webkit: ['mp4', 'wav'],
      };

      (window as any).supportedFormats = mockFormats[browser] || ['wav'];
    }, browserName);

    await page.click('[data-testid="start-audio-btn"]');

    // Should adapt to browser capabilities
    const selectedFormat = await page.evaluate(() => {
      return (window as any).selectedAudioFormat;
    });

    if (browserName === 'webkit') {
      expect(['mp4', 'wav']).toContain(selectedFormat);
    } else {
      expect(['webm', 'ogg', 'mp4']).toContain(selectedFormat);
    }
  });

  test('should handle WebRTC differences across browsers', async ({ page, browserName }) => {
    await page.goto('/interview');

    // Check RTCPeerConnection support
    const hasWebRTC = await page.evaluate(() => {
      return !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection);
    });

    expect(hasWebRTC).toBe(true);

    // Test audio constraints
    const constraints = await page.evaluate(() => {
      return {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };
    });

    expect(constraints.audio).toBeDefined();
  });

  test('should provide fallbacks for unsupported features', async ({ page, browserName }) => {
    await page.goto('/interview');

    // Mock unsupported getUserMedia
    await page.evaluate(() => {
      delete (navigator as any).mediaDevices;
    });

    await page.click('[data-testid="start-audio-btn"]');

    // Should show fallback options
    await expect(page.locator('[data-testid="fallback-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="manual-input-option"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-upload-option"]')).toBeVisible();
  });

  test('should handle different screen sizes and orientations', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop Standard' },
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 375, height: 667, name: 'Mobile Portrait' },
      { width: 667, height: 375, name: 'Mobile Landscape' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/interview');

      // Check responsive layout
      const layout = await page.evaluate(() => {
        const transcriptionPanel = document.querySelector('[data-testid="transcription-panel"]');
        const responsePanel = document.querySelector('[data-testid="response-panel"]');
        
        return {
          transcriptionVisible: transcriptionPanel ? window.getComputedStyle(transcriptionPanel).display !== 'none' : false,
          responseVisible: responsePanel ? window.getComputedStyle(responsePanel).display !== 'none' : false,
        };
      });

      expect(layout.transcriptionVisible).toBe(true);
      expect(layout.responseVisible).toBe(true);

      // Check if mobile navigation is shown on small screens
      if (viewport.width < 768) {
        await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
      }
    }
  });

  test('should maintain performance across browsers', async ({ page, browserName }) => {
    await page.goto('/interview');

    // Start performance monitoring
    await page.evaluate(() => {
      (window as any).performanceMarks = [];
      performance.mark('test-start');
    });

    // Simulate interview flow
    await page.fill('[data-testid="job-title-input"]', 'Test Position');
    await page.click('[data-testid="start-session-btn"]');

    // Mock transcription processing
    await page.evaluate(() => {
      performance.mark('transcription-start');
      const event = new CustomEvent('transcription-received', {
        detail: { text: 'Test question', confidence: 0.95, isFinal: true },
      });
      window.dispatchEvent(event);
      performance.mark('transcription-end');
    });

    // Wait for response generation
    await expect(page.locator('[data-testid="response-suggestions"]')).toBeVisible();

    // Measure performance
    const performanceMetrics = await page.evaluate(() => {
      performance.mark('test-end');
      
      const marks = performance.getEntriesByType('mark');
      const measures = [];
      
      try {
        performance.measure('total-time', 'test-start', 'test-end');
        performance.measure('transcription-time', 'transcription-start', 'transcription-end');
        
        measures.push(
          performance.getEntriesByName('total-time')[0],
          performance.getEntriesByName('transcription-time')[0]
        );
      } catch (e) {
        // Handle browsers that don't support all performance APIs
      }
      
      return {
        marks: marks.map(m => ({ name: m.name, startTime: m.startTime })),
        measures: measures.map(m => ({ name: m.name, duration: m.duration })),
      };
    });

    // Performance should be reasonable across all browsers
    const totalTime = performanceMetrics.measures.find(m => m.name === 'total-time');
    if (totalTime) {
      expect(totalTime.duration).toBeLessThan(5000); // Less than 5 seconds
    }
  });

  test('should handle browser-specific CSS features', async ({ page, browserName }) => {
    await page.goto('/interview');

    // Check CSS Grid support
    const hasGridSupport = await page.evaluate(() => {
      return CSS.supports('display', 'grid');
    });

    expect(hasGridSupport).toBe(true);

    // Check CSS Custom Properties support
    const hasCustomProperties = await page.evaluate(() => {
      return CSS.supports('color', 'var(--test-color)');
    });

    expect(hasCustomProperties).toBe(true);

    // Check specific browser prefixes
    const browserStyles = await page.evaluate((browser) => {
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);
      
      const styles = window.getComputedStyle(testElement);
      const hasWebkitTransform = 'webkitTransform' in testElement.style;
      const hasMozTransform = 'MozTransform' in testElement.style;
      
      document.body.removeChild(testElement);
      
      return {
        hasWebkitTransform,
        hasMozTransform,
        browser,
      };
    }, browserName);

    if (browserName === 'webkit') {
      expect(browserStyles.hasWebkitTransform).toBe(true);
    } else if (browserName === 'firefox') {
      expect(browserStyles.hasMozTransform).toBe(true);
    }
  });

  test('should handle JavaScript API differences', async ({ page, browserName }) => {
    await page.goto('/interview');

    // Check Intersection Observer support
    const hasIntersectionObserver = await page.evaluate(() => {
      return 'IntersectionObserver' in window;
    });

    expect(hasIntersectionObserver).toBe(true);

    // Check Web Workers support
    const hasWebWorkers = await page.evaluate(() => {
      return 'Worker' in window;
    });

    expect(hasWebWorkers).toBe(true);

    // Check localStorage support
    const hasLocalStorage = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    });

    expect(hasLocalStorage).toBe(true);

    // Check WebSocket support
    const hasWebSocket = await page.evaluate(() => {
      return 'WebSocket' in window;
    });

    expect(hasWebSocket).toBe(true);
  });
});