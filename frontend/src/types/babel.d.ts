// Type declarations for Babel packages to resolve TypeScript errors
declare module '@babel/generator' {
  export default function generate(ast: any, options?: any): { code: string; map?: any };
}

declare module '@babel/traverse' {
  export default function traverse(ast: any, visitor: any): void;
}

declare module '@babel/template' {
  interface Template {
    statement: (template: string) => any;
    expression: (template: string) => any;
  }
  const template: Template;
  export default template;
}

declare module '@babel/types' {
  export * from '@babel/types';
}

// Global type declarations to prevent babel__generator errors
declare module 'babel__generator' {
  export = generate;
}

declare module 'babel__traverse' {
  export = traverse;
}

declare module 'babel__template' {
  export = template;
}

declare module 'babel__types' {
  export * from '@babel/types';
}