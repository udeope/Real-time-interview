import dynamic from 'next/dynamic';
import { lazy, Suspense } from 'react';

interface BundleMetrics {
  chunkName: string;
  size: number;
  loadTime: number;
  cacheHit: boolean;
  timestamp: Date;
}

interface LoadingStrategy {
  component: string;
  strategy: 'eager' | 'lazy' | 'preload' | 'prefetch';
  priority: 'high' | 'medium' | 'low';
  conditions?: string[];
}

class BundleOptimizerService {
  private loadingStrategies: Map<string, LoadingStrategy> = new Map();
  private bundleMetrics: BundleMetrics[] = [];
  private preloadedChunks: Set<string> = new Set();
  private intersectionObserver?: IntersectionObserver;

  constructor() {
    this.initializeLoadingStrategies();
    this.setupIntersectionObserver();
  }

  /**
   * Initialize loading strategies for different components
   */
  private initializeLoadingStrategies() {
    // Critical components - load immediately
    this.loadingStrategies.set('AudioCapturePanel', {
      component: 'AudioCapturePanel',
      strategy: 'eager',
      priority: 'high'
    });

    this.loadingStrategies.set('TranscriptionPanel', {
      component: 'TranscriptionPanel',
      strategy: 'eager',
      priority: 'high'
    });

    this.loadingStrategies.set('ResponseSuggestionsPanel', {
      component: 'ResponseSuggestionsPanel',
      strategy: 'eager',
      priority: 'high'
    });

    // Important but not critical - preload
    this.loadingStrategies.set('ContextPanel', {
      component: 'ContextPanel',
      strategy: 'preload',
      priority: 'medium'
    });

    this.loadingStrategies.set('InterviewSession', {
      component: 'InterviewSession',
      strategy: 'preload',
      priority: 'medium'
    });

    // Secondary features - lazy load
    this.loadingStrategies.set('PracticeMode', {
      component: 'PracticeMode',
      strategy: 'lazy',
      priority: 'medium',
      conditions: ['user-navigates-to-practice']
    });

    this.loadingStrategies.set('AnalyticsDashboard', {
      component: 'AnalyticsDashboard',
      strategy: 'lazy',
      priority: 'low',
      conditions: ['user-navigates-to-analytics']
    });

    this.loadingStrategies.set('AdvancedSettings', {
      component: 'AdvancedSettings',
      strategy: 'lazy',
      priority: 'low',
      conditions: ['user-opens-settings']
    });

    // Heavy components - prefetch on interaction
    this.loadingStrategies.set('VideoConferencingIntegration', {
      component: 'VideoConferencingIntegration',
      strategy: 'prefetch',
      priority: 'low',
      conditions: ['user-hovers-integration-button']
    });
  }

  /**
   * Setup intersection observer for viewport-based loading
   */
  private setupIntersectionObserver() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const componentName = entry.target.getAttribute('data-component');
              if (componentName) {
                this.loadComponent(componentName);
              }
            }
          });
        },
        {
          rootMargin: '50px', // Load 50px before entering viewport
          threshold: 0.1
        }
      );
    }
  }

  /**
   * Create optimized dynamic imports with loading strategies
   */
  createDynamicComponent(componentName: string, importPath: string) {
    const strategy = this.loadingStrategies.get(componentName);
    
    if (!strategy) {
      // Default lazy loading for unknown components
      return dynamic(() => import(importPath), {
        loading: () => <div>Loading...</div>,
        ssr: false
      });
    }

    switch (strategy.strategy) {
      case 'eager':
        // Load immediately, no code splitting
        return dynamic(() => import(importPath), {
          ssr: true
        });

      case 'preload':
        // Preload but still code split
        return dynamic(() => import(importPath), {
          loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
          ssr: false
        });

      case 'lazy':
        // Lazy load with intersection observer
        return dynamic(() => import(importPath), {
          loading: () => (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ),
          ssr: false
        });

      case 'prefetch':
        // Prefetch on user interaction
        return dynamic(() => import(importPath), {
          loading: () => <div>Loading advanced features...</div>,
          ssr: false
        });

      default:
        return dynamic(() => import(importPath));
    }
  }

  /**
   * Preload critical chunks based on user behavior
   */
  async preloadCriticalChunks(userBehavior: {
    currentPage: string;
    userType: 'new' | 'returning';
    subscription: 'free' | 'pro' | 'enterprise';
    previousActions: string[];
  }) {
    const { currentPage, userType, subscription, previousActions } = userBehavior;
    
    // Always preload core chunks
    const coreChunks = ['audio', 'transcription', 'responses'];
    await this.preloadChunks(coreChunks);

    // Preload based on current page
    switch (currentPage) {
      case '/interview':
        await this.preloadChunks(['interview-session', 'context-analysis']);
        break;
      case '/practice':
        await this.preloadChunks(['practice-mode', 'feedback-system']);
        break;
      case '/dashboard':
        await this.preloadChunks(['analytics', 'user-profile']);
        break;
    }

    // Preload based on user type
    if (userType === 'new') {
      await this.preloadChunks(['onboarding', 'tutorial']);
    }

    // Preload based on subscription
    if (subscription === 'pro' || subscription === 'enterprise') {
      await this.preloadChunks(['advanced-features', 'integrations']);
    }

    // Preload based on previous actions
    if (previousActions.includes('used-practice-mode')) {
      await this.preloadChunks(['practice-analytics', 'question-bank']);
    }

    if (previousActions.includes('connected-linkedin')) {
      await this.preloadChunks(['linkedin-integration', 'profile-sync']);
    }
  }

  /**
   * Preload specific chunks
   */
  private async preloadChunks(chunkNames: string[]): Promise<void> {
    const preloadPromises = chunkNames
      .filter(chunk => !this.preloadedChunks.has(chunk))
      .map(async (chunk) => {
        try {
          const startTime = performance.now();
          
          // Simulate chunk loading (in real implementation, use webpack's import())
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
          
          const endTime = performance.now();
          const loadTime = endTime - startTime;
          
          this.preloadedChunks.add(chunk);
          
          this.recordBundleMetric({
            chunkName: chunk,
            size: Math.random() * 50000 + 10000, // Simulated size
            loadTime,
            cacheHit: Math.random() > 0.3, // 70% cache hit rate
            timestamp: new Date()
          });
          
          console.log(`Preloaded chunk: ${chunk} (${loadTime.toFixed(2)}ms)`);
        } catch (error) {
          console.warn(`Failed to preload chunk: ${chunk}`, error);
        }
      });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Load component based on strategy
   */
  async loadComponent(componentName: string): Promise<void> {
    const strategy = this.loadingStrategies.get(componentName);
    
    if (!strategy) {
      console.warn(`No loading strategy found for component: ${componentName}`);
      return;
    }

    // Check conditions if any
    if (strategy.conditions && !this.checkConditions(strategy.conditions)) {
      return;
    }

    const startTime = performance.now();
    
    try {
      // Simulate component loading
      await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      this.recordBundleMetric({
        chunkName: componentName,
        size: Math.random() * 30000 + 5000,
        loadTime,
        cacheHit: this.preloadedChunks.has(componentName),
        timestamp: new Date()
      });
      
      console.log(`Loaded component: ${componentName} (${loadTime.toFixed(2)}ms)`);
    } catch (error) {
      console.error(`Failed to load component: ${componentName}`, error);
    }
  }

  /**
   * Check if conditions are met for loading
   */
  private checkConditions(conditions: string[]): boolean {
    // Simplified condition checking (in real implementation, check actual conditions)
    return conditions.every(condition => {
      switch (condition) {
        case 'user-navigates-to-practice':
          return window.location.pathname.includes('/practice');
        case 'user-navigates-to-analytics':
          return window.location.pathname.includes('/analytics');
        case 'user-opens-settings':
          return document.querySelector('[data-settings-open]') !== null;
        case 'user-hovers-integration-button':
          return true; // Would check actual hover state
        default:
          return true;
      }
    });
  }

  /**
   * Optimize bundle loading based on network conditions
   */
  optimizeForNetworkConditions(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          // Disable preloading, load only critical components
          this.disablePreloading();
          break;
        case '3g':
          // Reduce preloading, prioritize critical components
          this.reducePreloading();
          break;
        case '4g':
        default:
          // Full preloading strategy
          this.enableFullPreloading();
          break;
      }
    }
  }

  /**
   * Disable preloading for slow connections
   */
  private disablePreloading(): void {
    for (const [name, strategy] of this.loadingStrategies) {
      if (strategy.strategy === 'preload' || strategy.strategy === 'prefetch') {
        strategy.strategy = 'lazy';
      }
    }
    console.log('Disabled preloading due to slow network');
  }

  /**
   * Reduce preloading for medium connections
   */
  private reducePreloading(): void {
    for (const [name, strategy] of this.loadingStrategies) {
      if (strategy.strategy === 'prefetch' && strategy.priority === 'low') {
        strategy.strategy = 'lazy';
      }
    }
    console.log('Reduced preloading due to medium network');
  }

  /**
   * Enable full preloading for fast connections
   */
  private enableFullPreloading(): void {
    // Restore original strategies
    this.initializeLoadingStrategies();
    console.log('Enabled full preloading for fast network');
  }

  /**
   * Create lazy-loaded route components
   */
  createLazyRoutes() {
    return {
      // Main pages
      Dashboard: dynamic(() => import('../app/dashboard/page'), {
        loading: () => <div className="animate-pulse bg-gray-100 h-screen"></div>
      }),
      
      Interview: dynamic(() => import('../app/interview/page'), {
        loading: () => <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Preparing interview session...</div>
        </div>
      }),
      
      Practice: dynamic(() => import('../app/practice/page'), {
        loading: () => <div className="animate-pulse bg-gray-100 h-screen"></div>
      }),
      
      // Settings pages (lazy loaded)
      Settings: dynamic(() => import('../app/settings/page'), {
        loading: () => <div>Loading settings...</div>,
        ssr: false
      }),
      
      Profile: dynamic(() => import('../app/profile/page'), {
        loading: () => <div>Loading profile...</div>,
        ssr: false
      }),
      
      // Advanced features (very lazy)
      Analytics: dynamic(() => import('../app/analytics/page'), {
        loading: () => <div>Loading analytics...</div>,
        ssr: false
      }),
      
      Integrations: dynamic(() => import('../app/integrations/page'), {
        loading: () => <div>Loading integrations...</div>,
        ssr: false
      })
    };
  }

  /**
   * Record bundle loading metrics
   */
  private recordBundleMetric(metric: BundleMetrics): void {
    this.bundleMetrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.bundleMetrics.length > 1000) {
      this.bundleMetrics = this.bundleMetrics.slice(-500);
    }
  }

  /**
   * Get bundle performance analytics
   */
  getBundleAnalytics(): {
    totalChunks: number;
    averageLoadTime: number;
    cacheHitRate: number;
    largestChunks: Array<{ name: string; size: number }>;
    slowestChunks: Array<{ name: string; loadTime: number }>;
    recommendations: string[];
  } {
    if (this.bundleMetrics.length === 0) {
      return {
        totalChunks: 0,
        averageLoadTime: 0,
        cacheHitRate: 0,
        largestChunks: [],
        slowestChunks: [],
        recommendations: []
      };
    }

    const totalChunks = this.bundleMetrics.length;
    const averageLoadTime = this.bundleMetrics.reduce((sum, m) => sum + m.loadTime, 0) / totalChunks;
    const cacheHits = this.bundleMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalChunks) * 100;

    // Find largest chunks
    const largestChunks = [...this.bundleMetrics]
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .map(m => ({ name: m.chunkName, size: m.size }));

    // Find slowest chunks
    const slowestChunks = [...this.bundleMetrics]
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, 5)
      .map(m => ({ name: m.chunkName, loadTime: m.loadTime }));

    // Generate recommendations
    const recommendations = [];
    
    if (averageLoadTime > 500) {
      recommendations.push('Consider reducing bundle sizes or implementing more aggressive code splitting');
    }
    
    if (cacheHitRate < 70) {
      recommendations.push('Improve caching strategy to increase cache hit rate');
    }
    
    if (largestChunks[0]?.size > 100000) {
      recommendations.push(`Consider splitting large chunk: ${largestChunks[0].name}`);
    }

    return {
      totalChunks,
      averageLoadTime,
      cacheHitRate,
      largestChunks,
      slowestChunks,
      recommendations
    };
  }

  /**
   * Observe element for lazy loading
   */
  observeElement(element: HTMLElement, componentName: string): void {
    if (this.intersectionObserver) {
      element.setAttribute('data-component', componentName);
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Unobserve element
   */
  unobserveElement(element: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    this.bundleMetrics = [];
    this.preloadedChunks.clear();
  }
}

export default BundleOptimizerService;