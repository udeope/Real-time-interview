import '@testing-library/jest-dom';

// Performance testing utilities
export class PerformanceTimer {
  private startTime: number = 0;
  private endTime: number = 0;

  start() {
    this.startTime = performance.now();
  }

  end() {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  getDuration() {
    return this.endTime - this.startTime;
  }
}

export function expectRenderTimeUnder(actualMs: number, expectedMs: number) {
  expect(actualMs).toBeLessThan(expectedMs);
}

export function expectMemoryUsageUnder(actualBytes: number, expectedBytes: number) {
  expect(actualBytes).toBeLessThan(expectedBytes);
}

// Mock performance APIs
Object.defineProperty(window, 'performance', {
  value: {
    ...performance,
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    now: jest.fn(() => Date.now()),
  },
});

// Mock Web Audio API for performance tests
Object.defineProperty(window, 'AudioContext', {
  value: jest.fn().mockImplementation(() => ({
    createAnalyser: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn(),
    })),
    createMediaStreamSource: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    close: jest.fn(),
    state: 'running',
  })),
});

// Mock getUserMedia for performance tests
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => 
      Promise.resolve({
        getTracks: () => [{ stop: jest.fn() }],
        getAudioTracks: () => [{ stop: jest.fn() }],
      })
    ),
    enumerateDevices: jest.fn(() => 
      Promise.resolve([
        { deviceId: 'default', kind: 'audioinput', label: 'Default Microphone' }
      ])
    ),
  },
});

// Mock Socket.IO for performance tests
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}));

// Mock Next.js router for performance tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
}));