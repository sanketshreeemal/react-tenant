// Type declarations for modules without type definitions
declare module 'react';
declare module 'next/navigation';
declare module 'firebase/firestore';
declare module 'firebase/storage';
declare module 'lucide-react';
declare module 'date-fns';

// Extend JSX namespace
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
} 