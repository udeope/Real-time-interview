interface CDNConfig {
  baseUrl: string;
  regions: string[];
  cacheRules: CacheRule[];
  compressionEnabled: boolean;
  imageOptimization: boolean;
}

interface CacheRule {
  pattern: string;
  ttl: number;
  headers: Record<string, string>;
  compression: boolean;
}

interface EdgeCacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  region: string;
}

class CDNOptimizerService {
  private config: CDNConfig;
  private edgeCache: Map<string, EdgeCacheEntry> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_CDN_URL || '',
      regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      cacheRules: [
        {
          pattern: '/static/*',
          ttl: 31536000, // 1 year
          headers: {
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Encoding': 'gzip'
          },
          compression: true
        },
        {
          pattern: '/api/responses/*',
          ttl: 3600, // 1 hour
          headers: {
            'Cache-Control': 'public, max-age=3600',
            'Vary': 'Accept-Encoding'
          },
          compression: true
        },
        {
          pattern: '/api/context/*',
          ttl: 1800, // 30 minutes
          headers: {
            'Cache-Control': 'public, max-age=1800',
            'ETag': 'true'
          },
          compression: true
        }
      ],
      compressionEnabled: true,
      imageOptimization: true
    };

    this.initializeEdgeCache();
  }

  /**
   * Initialize edge cache with regional distribution
   */
  private initializeEdgeCache() {
    // Preload frequently accessed data
    const commonResponses = [
      'behavioral-templates',
      'technical-frameworks',
      'company-data',
      'question-patterns'
    ];

    commonResponses.forEach(key => {
      this.config.regions.forEach(region => {
        this.edgeCache.set(`${region}:${key}`, {
          key,
          data: null, // Would be loaded from API
          timestamp: Date.now(),
          ttl: 3600000, // 1 hour
          region
        });
      });
    });
  }

  /**
   * Get optimal CDN endpoint based on user location
   */
  getOptimalEndpoint(userLocation?: { lat: number; lng: number }): string {
    if (!userLocation) {
      return this.config.baseUrl;
    }

    // Simple region selection based on location
    const { lat, lng } = userLocation;
    
    // North America
    if (lat > 25 && lat < 60 && lng > -130 && lng < -60) {
      return `${this.config.baseUrl}/us-east-1`;
    }
    
    // Europe
    if (lat > 35 && lat < 70 && lng > -10 && lng < 40) {
      return `${this.config.baseUrl}/eu-west-1`;
    }
    
    // Asia Pacific
    if (lat > -10 && lat < 50 && lng > 90 && lng < 180) {
      return `${this.config.baseUrl}/ap-southeast-1`;
    }
    
    // Default to US East
    return `${this.config.baseUrl}/us-east-1`;
  }

  /**
   * Cache response data at edge locations
   */
  async cacheAtEdge(
    key: string,
    data: any,
    ttl: number = 3600000,
    regions: string[] = this.config.regions
  ): Promise<void> {
    const timestamp = Date.now();
    
    regions.forEach(region => {
      const cacheKey = `${region}:${key}`;
      this.edgeCache.set(cacheKey, {
        key,
        data: this.compressData(data),
        timestamp,
        ttl,
        region
      });
    });

    // Simulate CDN distribution
    await this.distributeToCDN(key, data, ttl, regions);
  }

  /**
   * Retrieve data from nearest edge location
   */
  async getFromEdge(
    key: string,
    userRegion: string = 'us-east-1'
  ): Promise<any | null> {
    const cacheKey = `${userRegion}:${key}`;
    const entry = this.edgeCache.get(cacheKey);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.edgeCache.delete(cacheKey);
      return null;
    }
    
    // Record cache hit
    this.recordCacheHit(key, userRegion);
    
    return this.decompressData(entry.data);
  }

  /**
   * Optimize static assets for CDN delivery
   */
  optimizeStaticAssets(): {
    images: string[];
    scripts: string[];
    styles: string[];
    fonts: string[];
  } {
    return {
      images: [
        // Convert to WebP format with multiple sizes
        '/images/logo.webp?w=100&q=80',
        '/images/logo.webp?w=200&q=80',
        '/images/logo.webp?w=400&q=80',
        '/images/background.webp?w=1920&q=75',
        '/images/background.webp?w=1280&q=75',
        '/images/background.webp?w=768&q=75'
      ],
      scripts: [
        // Minified and compressed JavaScript bundles
        '/js/main.min.js?v=1.0.0',
        '/js/vendor.min.js?v=1.0.0',
        '/js/audio-capture.min.js?v=1.0.0'
      ],
      styles: [
        // Critical CSS inlined, non-critical loaded async
        '/css/critical.min.css?v=1.0.0',
        '/css/main.min.css?v=1.0.0'
      ],
      fonts: [
        // Preload critical fonts with font-display: swap
        '/fonts/inter-var.woff2',
        '/fonts/inter-regular.woff2',
        '/fonts/inter-medium.woff2'
      ]
    };
  }

  /**
   * Implement intelligent prefetching
   */
  async prefetchCriticalResources(userProfile: any): Promise<void> {
    const criticalResources = this.identifyCriticalResources(userProfile);
    
    // Prefetch in parallel with priority
    const prefetchPromises = criticalResources.map(async (resource, index) => {
      // Stagger requests to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, index * 100));
      
      return this.prefetchResource(resource);
    });
    
    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Identify critical resources based on user behavior
   */
  private identifyCriticalResources(userProfile: any): string[] {
    const resources = [];
    
    // Always prefetch common templates
    resources.push('/api/responses/templates/behavioral');
    resources.push('/api/responses/templates/technical');
    
    // Prefetch based on user's industry and seniority
    if (userProfile?.industries?.includes('technology')) {
      resources.push('/api/responses/templates/technical-advanced');
      resources.push('/api/context/tech-companies');
    }
    
    if (userProfile?.seniority === 'senior' || userProfile?.seniority === 'lead') {
      resources.push('/api/responses/templates/leadership');
      resources.push('/api/responses/templates/strategic');
    }
    
    // Prefetch recent question patterns
    resources.push('/api/analytics/question-patterns');
    
    return resources;
  }

  /**
   * Prefetch individual resource
   */
  private async prefetchResource(url: string): Promise<void> {
    try {
      const startTime = performance.now();
      
      // Use fetch with cache-first strategy
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=3600',
          'Priority': 'low' // Use resource hints for better prioritization
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const endTime = performance.now();
        
        // Cache the prefetched data
        await this.cacheAtEdge(
          this.generateCacheKey(url),
          data,
          3600000 // 1 hour TTL
        );
        
        // Record performance metrics
        this.recordPrefetchMetric(url, endTime - startTime);
      }
    } catch (error) {
      console.warn(`Failed to prefetch resource: ${url}`, error);
    }
  }

  /**
   * Implement service worker for offline caching
   */
  generateServiceWorkerConfig(): string {
    return `
const CACHE_NAME = 'ai-interview-assistant-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

const STATIC_ASSETS = [
  '/',
  '/interview',
  '/practice',
  '/dashboard',
  '/css/critical.min.css',
  '/js/main.min.js',
  '/js/vendor.min.js',
  '/fonts/inter-var.woff2'
];

const CACHE_STRATEGIES = {
  '/api/responses/': 'stale-while-revalidate',
  '/api/context/': 'network-first',
  '/api/transcription/': 'network-only',
  '/static/': 'cache-first'
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Determine cache strategy based on URL pattern
  const strategy = Object.keys(CACHE_STRATEGIES).find(pattern => 
    url.pathname.startsWith(pattern)
  );
  
  if (strategy) {
    event.respondWith(handleRequest(request, CACHE_STRATEGIES[strategy]));
  }
});

async function handleRequest(request, strategy) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  switch (strategy) {
    case 'cache-first':
      return cacheFirst(request, cache);
    case 'network-first':
      return networkFirst(request, cache);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request, cache);
    case 'network-only':
      return fetch(request);
    default:
      return fetch(request);
  }
}

async function cacheFirst(request, cache) {
  const cached = await cache.match(request);
  return cached || fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });
}

async function networkFirst(request, cache) {
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return cache.match(request);
  }
}

async function staleWhileRevalidate(request, cache) {
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });
  
  return cached || fetchPromise;
}
`;
  }

  /**
   * Optimize images for different screen sizes and formats
   */
  generateResponsiveImageConfig(imagePath: string): {
    srcSet: string;
    sizes: string;
    webp: string;
    fallback: string;
  } {
    const basePath = imagePath.replace(/\.[^/.]+$/, '');
    const extension = imagePath.split('.').pop();
    
    return {
      srcSet: [
        `${basePath}.webp?w=400&q=80 400w`,
        `${basePath}.webp?w=800&q=80 800w`,
        `${basePath}.webp?w=1200&q=80 1200w`,
        `${basePath}.webp?w=1600&q=80 1600w`
      ].join(', '),
      sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      webp: `${basePath}.webp?w=800&q=80`,
      fallback: `${basePath}.${extension}?w=800&q=80`
    };
  }

  /**
   * Implement resource bundling and code splitting
   */
  generateBundleConfig(): {
    critical: string[];
    deferred: string[];
    lazy: string[];
  } {
    return {
      critical: [
        // Critical path resources loaded immediately
        '/js/core.min.js',
        '/css/critical.min.css',
        '/js/audio-capture.min.js'
      ],
      deferred: [
        // Important but not critical resources
        '/js/ui-components.min.js',
        '/css/components.min.css',
        '/js/analytics.min.js'
      ],
      lazy: [
        // Loaded on demand
        '/js/practice-mode.min.js',
        '/js/advanced-features.min.js',
        '/css/themes.min.css'
      ]
    };
  }

  /**
   * Monitor CDN performance and cache hit rates
   */
  getCDNPerformanceMetrics(): {
    cacheHitRate: number;
    averageLatency: number;
    bandwidthSaved: number;
    regionalPerformance: Record<string, any>;
  } {
    const totalRequests = Array.from(this.performanceMetrics.values())
      .reduce((sum, metrics) => sum + metrics.length, 0);
    
    const cacheHits = this.edgeCache.size;
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    
    const allLatencies = Array.from(this.performanceMetrics.values())
      .flat();
    const averageLatency = allLatencies.length > 0 
      ? allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length 
      : 0;
    
    const regionalPerformance = {};
    this.config.regions.forEach(region => {
      const regionMetrics = this.performanceMetrics.get(region) || [];
      regionalPerformance[region] = {
        requests: regionMetrics.length,
        averageLatency: regionMetrics.length > 0 
          ? regionMetrics.reduce((sum, lat) => sum + lat, 0) / regionMetrics.length 
          : 0,
        cacheEntries: Array.from(this.edgeCache.keys())
          .filter(key => key.startsWith(`${region}:`)).length
      };
    });
    
    return {
      cacheHitRate,
      averageLatency,
      bandwidthSaved: cacheHitRate * 0.7, // Estimated bandwidth savings
      regionalPerformance
    };
  }

  /**
   * Compress data for edge caching
   */
  private compressData(data: any): string {
    // Simple compression simulation (in real implementation, use gzip/brotli)
    return JSON.stringify(data);
  }

  /**
   * Decompress cached data
   */
  private decompressData(compressedData: string): any {
    return JSON.parse(compressedData);
  }

  /**
   * Distribute data to CDN (simulation)
   */
  private async distributeToCDN(
    key: string,
    data: any,
    ttl: number,
    regions: string[]
  ): Promise<void> {
    // Simulate CDN distribution delay
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`Distributed ${key} to CDN regions: ${regions.join(', ')}`);
  }

  /**
   * Record cache hit for analytics
   */
  private recordCacheHit(key: string, region: string): void {
    const latency = Math.random() * 50 + 10; // Simulated low latency for cache hits
    
    if (!this.performanceMetrics.has(region)) {
      this.performanceMetrics.set(region, []);
    }
    
    this.performanceMetrics.get(region).push(latency);
  }

  /**
   * Record prefetch performance metric
   */
  private recordPrefetchMetric(url: string, latency: number): void {
    const region = 'prefetch';
    
    if (!this.performanceMetrics.has(region)) {
      this.performanceMetrics.set(region, []);
    }
    
    this.performanceMetrics.get(region).push(latency);
  }

  /**
   * Generate cache key for URL
   */
  private generateCacheKey(url: string): string {
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, entry] of this.edgeCache) {
      if (now - entry.timestamp > entry.ttl) {
        this.edgeCache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  /**
   * Preload critical resources for faster initial load
   */
  generatePreloadTags(): string[] {
    const preloadTags = [];
    
    // Preload critical fonts
    preloadTags.push(
      '<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>',
      '<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>'
    );
    
    // Preload critical CSS
    preloadTags.push(
      '<link rel="preload" href="/css/critical.min.css" as="style">',
      '<link rel="preload" href="/js/core.min.js" as="script">'
    );
    
    // DNS prefetch for external services
    preloadTags.push(
      '<link rel="dns-prefetch" href="//api.openai.com">',
      '<link rel="dns-prefetch" href="//speech.googleapis.com">',
      '<link rel="preconnect" href="//cdn.jsdelivr.net" crossorigin>'
    );
    
    return preloadTags;
  }
}

export default CDNOptimizerService;