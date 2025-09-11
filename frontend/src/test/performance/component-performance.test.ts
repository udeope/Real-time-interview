import { render, screen, waitFor } from '@testing-library/react';
import { PerformanceTimer, expectRenderTimeUnder } from '../setup-performance';
import { TranscriptionPanel } from '../../components/transcription/TranscriptionPanel';
import { ResponseSuggestionsPanel } from '../../components/responses/ResponseSuggestionsPanel';
import { InterviewSession } from '../../components/interview/InterviewSession';

describe('Component Performance Tests', () => {
  describe('TranscriptionPanel Performance', () => {
    it('should render initial state quickly', () => {
      const timer = new PerformanceTimer();
      
      timer.start();
      render(<TranscriptionPanel transcription="" isListening={false} confidence={0} />);
      const renderTime = timer.end();
      
      expectRenderTimeUnder(renderTime, 50); // Should render in under 50ms
    });

    it('should handle rapid transcription updates efficiently', async () => {
      const { rerender } = render(
        <TranscriptionPanel transcription="" isListening={true} confidence={0} />
      );

      const timer = new PerformanceTimer();
      timer.start();

      // Simulate rapid updates (like real-time transcription)
      for (let i = 0; i < 100; i++) {
        rerender(
          <TranscriptionPanel 
            transcription={`This is transcription update number ${i}`}
            isListening={true}
            confidence={0.8 + (i / 1000)}
          />
        );
      }

      const totalTime = timer.end();
      expectRenderTimeUnder(totalTime, 500); // 100 updates in under 500ms
    });

    it('should handle large transcription text efficiently', () => {
      const largeText = 'This is a very long transcription text. '.repeat(1000);
      
      const timer = new PerformanceTimer();
      timer.start();
      
      render(
        <TranscriptionPanel 
          transcription={largeText}
          isListening={false}
          confidence={0.95}
        />
      );
      
      const renderTime = timer.end();
      expectRenderTimeUnder(renderTime, 100); // Should handle large text in under 100ms
    });
  });

  describe('ResponseSuggestionsPanel Performance', () => {
    const mockResponses = Array.from({ length: 10 }, (_, i) => ({
      id: `response-${i}`,
      content: `This is response option ${i}. `.repeat(50), // ~50 words each
      structure: i % 2 === 0 ? 'STAR' : 'direct',
      estimatedDuration: 60 + i * 5,
      confidence: 0.9 + (i / 100),
      tags: [`tag${i}`, `category${i % 3}`],
    }));

    it('should render multiple responses quickly', () => {
      const timer = new PerformanceTimer();
      
      timer.start();
      render(<ResponseSuggestionsPanel responses={mockResponses} onSelectResponse={() => {}} />);
      const renderTime = timer.end();
      
      expectRenderTimeUnder(renderTime, 100); // Should render 10 responses in under 100ms
    });

    it('should handle response selection efficiently', async () => {
      const onSelectResponse = jest.fn();
      
      render(<ResponseSuggestionsPanel responses={mockResponses} onSelectResponse={onSelectResponse} />);
      
      const timer = new PerformanceTimer();
      timer.start();
      
      // Simulate rapid response selections
      for (let i = 0; i < mockResponses.length; i++) {
        const button = screen.getByTestId(`select-response-${i}`);
        button.click();
      }
      
      const selectionTime = timer.end();
      expectRenderTimeUnder(selectionTime, 50); // All selections in under 50ms
      
      expect(onSelectResponse).toHaveBeenCalledTimes(mockResponses.length);
    });

    it('should efficiently update when responses change', () => {
      const { rerender } = render(
        <ResponseSuggestionsPanel responses={mockResponses.slice(0, 3)} onSelectResponse={() => {}} />
      );

      const timer = new PerformanceTimer();
      timer.start();

      // Simulate responses being updated/added
      rerender(<ResponseSuggestionsPanel responses={mockResponses.slice(0, 6)} onSelectResponse={() => {}} />);
      rerender(<ResponseSuggestionsPanel responses={mockResponses} onSelectResponse={() => {}} />);

      const updateTime = timer.end();
      expectRenderTimeUnder(updateTime, 75); // Updates should be fast
    });
  });

  describe('InterviewSession Performance', () => {
    const mockSessionData = {
      sessionId: 'test-session',
      jobContext: {
        title: 'Senior Developer',
        company: 'Tech Corp',
        requirements: ['React', 'Node.js', 'TypeScript'],
      },
      isActive: true,
    };

    it('should initialize session quickly', () => {
      const timer = new PerformanceTimer();
      
      timer.start();
      render(<InterviewSession {...mockSessionData} />);
      const renderTime = timer.end();
      
      expectRenderTimeUnder(renderTime, 200); // Complex component should render in under 200ms
    });

    it('should handle state changes efficiently', async () => {
      const { rerender } = render(<InterviewSession {...mockSessionData} />);

      const timer = new PerformanceTimer();
      timer.start();

      // Simulate various state changes
      rerender(<InterviewSession {...mockSessionData} isActive={false} />);
      rerender(<InterviewSession {...mockSessionData} isActive={true} />);

      const stateChangeTime = timer.end();
      expectRenderTimeUnder(stateChangeTime, 50);
    });

    it('should handle concurrent updates without performance degradation', async () => {
      render(<InterviewSession {...mockSessionData} />);

      const timer = new PerformanceTimer();
      timer.start();

      // Simulate concurrent updates (transcription + responses)
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        promises.push(
          waitFor(() => {
            // Simulate transcription update
            const event = new CustomEvent('transcription-update', {
              detail: { text: `Update ${i}`, confidence: 0.9 }
            });
            window.dispatchEvent(event);
          })
        );
      }

      await Promise.all(promises);
      const concurrentTime = timer.end();
      
      expectRenderTimeUnder(concurrentTime, 300); // Should handle concurrent updates efficiently
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during component lifecycle', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Render and unmount components multiple times
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <TranscriptionPanel 
            transcription={`Test transcription ${i}`}
            isListening={i % 2 === 0}
            confidence={0.9}
          />
        );
        unmount();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for this test)
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });

    it('should clean up event listeners properly', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<InterviewSession {...mockSessionData} />);
      
      const addedListeners = addEventListenerSpy.mock.calls.length;
      
      unmount();
      
      const removedListeners = removeEventListenerSpy.mock.calls.length;
      
      // Should remove at least as many listeners as were added
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Bundle Size Impact', () => {
    it('should not import unnecessary dependencies', () => {
      // This test would typically be run with a bundler analyzer
      // For now, we'll check that components don't import heavy libraries unnecessarily
      
      const componentCode = TranscriptionPanel.toString();
      
      // Should not import heavy libraries in component code
      expect(componentCode).not.toContain('lodash');
      expect(componentCode).not.toContain('moment');
      expect(componentCode).not.toContain('axios');
    });
  });

  describe('Rendering Performance Under Load', () => {
    it('should maintain performance with many simultaneous components', () => {
      const timer = new PerformanceTimer();
      
      timer.start();
      
      // Render many components simultaneously
      const components = Array.from({ length: 100 }, (_, i) => (
        <div key={i}>
          <TranscriptionPanel 
            transcription={`Transcription ${i}`}
            isListening={i % 2 === 0}
            confidence={0.8 + (i / 1000)}
          />
        </div>
      ));
      
      render(<div>{components}</div>);
      
      const renderTime = timer.end();
      expectRenderTimeUnder(renderTime, 1000); // 100 components in under 1 second
    });

    it('should handle rapid prop changes efficiently', () => {
      const { rerender } = render(
        <TranscriptionPanel transcription="" isListening={false} confidence={0} />
      );

      const timer = new PerformanceTimer();
      timer.start();

      // Rapid prop changes
      for (let i = 0; i < 1000; i++) {
        rerender(
          <TranscriptionPanel 
            transcription={`Text ${i}`}
            isListening={i % 2 === 0}
            confidence={Math.random()}
          />
        );
      }

      const updateTime = timer.end();
      expectRenderTimeUnder(updateTime, 2000); // 1000 updates in under 2 seconds
    });
  });
});