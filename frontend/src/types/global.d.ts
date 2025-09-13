// Global type declarations to fix TypeScript issues

// Fix for babel__generator type error
declare module 'babel__generator' {
  const content: any;
  export = content;
}

declare module 'babel__traverse' {
  const content: any;
  export = content;
}

declare module 'babel__template' {
  const content: any;
  export = content;
}

declare module 'babel__types' {
  const content: any;
  export = content;
}

// Additional global types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_PUBLIC_API_URL?: string;
      NEXT_PUBLIC_WS_URL?: string;
    }
  }
}

export {};