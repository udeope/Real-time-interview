/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Enable React Server Components
    serverComponents: true,
    // Enable concurrent features
    concurrentFeatures: true,
    // Enable SWC minification for better performance
    swcMinify: true,
    // Enable modern JavaScript output
    esmExternals: true,
    // Enable optimized images
    images: {
      allowFutureImage: true
    }
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
    // Enable React optimizations
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    // Enable styled-components optimization
    styledComponents: true
  },

  // Image optimization
  images: {
    domains: ['cdn.example.com', 'images.unsplash.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev) {
      // Enable tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Optimize chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunk for third-party libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          },
          // Common chunk for shared components
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
            enforce: true
          },
          // Audio processing chunk
          audio: {
            test: /[\\/]src[\\/](lib|components)[\\/].*audio.*\.(js|ts|tsx)$/,
            name: 'audio',
            chunks: 'all',
            priority: 8,
            reuseExistingChunk: true
          },
          // AI/ML related chunk
          ai: {
            test: /[\\/]src[\\/](lib|components)[\\/].*(ai|ml|response|transcription).*\.(js|ts|tsx)$/,
            name: 'ai',
            chunks: 'all',
            priority: 8,
            reuseExistingChunk: true
          },
          // UI components chunk
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 7,
            reuseExistingChunk: true
          }
        }
      };

      // Minimize bundle size
      config.optimization.minimize = true;
      
      // Add bundle analyzer in development
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html'
          })
        );
      }
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      // Use ES modules for better tree shaking
      'lodash': 'lodash-es',
      // Optimize React imports
      'react': 'react/index.js',
      'react-dom': 'react-dom/index.js'
    };

    // Add performance hints
    config.performance = {
      hints: 'warning',
      maxEntrypointSize: 250000, // 250KB
      maxAssetSize: 250000, // 250KB
      assetFilter: (assetFilename) => {
        return !assetFilename.endsWith('.map');
      }
    };

    // Optimize module resolution
    config.resolve.modules = ['node_modules', 'src'];
    
    return config;
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'Content-Encoding',
            value: 'gzip'
          }
        ]
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600'
          }
        ]
      }
    ];
  },

  // Redirects for SEO and performance
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true
      }
    ];
  },

  // Rewrites for API optimization
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*'
      }
    ];
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Output configuration
  output: 'standalone',
  
  // Compression
  compress: true,
  
  // Power by header
  poweredByHeader: false,
  
  // Generate ETags
  generateEtags: true,
  
  // Strict mode
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    // Ignore build errors in production (handle separately)
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Ignore ESLint errors during builds (handle separately)
    ignoreDuringBuilds: false,
  },

  // Trailing slash
  trailingSlash: false,

  // Asset prefix for CDN
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.CDN_URL : '',

  // Base path
  basePath: '',

  // Internationalization
  i18n: {
    locales: ['en', 'es', 'fr'],
    defaultLocale: 'en',
    localeDetection: true
  }
};

module.exports = nextConfig;