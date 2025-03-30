**Globals.css** - 

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

/* Import fonts needed for the theme */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap');

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 20 14.3% 4.1%;
    --card: 0 0% 100%;
    --card-foreground: 20 14.3% 4.1%;
    --popover: 0 0% 100%;
    --popover-foreground: 20 14.3% 4.1%;
    --primary: 24 9.8% 10%;
    --primary-foreground: 60 9.1% 97.8%;
    --secondary: 60 4.8% 95.9%;
    --secondary-foreground: 24 9.8% 10%;
    --muted: 60 4.8% 95.9%;
    --muted-foreground: 25 5.3% 44.7%;
    --accent: 60 4.8% 95.9%;
    --accent-foreground: 24 9.8% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 60 9.1% 97.8%;
    --border: 20 5.9% 90%;
    --input: 20 5.9% 90%;
    --ring: 20 14.3% 4.1%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 20 14.3% 4.1%;
    --foreground: 60 9.1% 97.8%;
    --card: 20 14.3% 4.1%;
    --card-foreground: 60 9.1% 97.8%;
    --popover: 20 14.3% 4.1%;
    --popover-foreground: 60 9.1% 97.8%;
    --primary: 60 9.1% 97.8%;
    --primary-foreground: 24 9.8% 10%;
    --secondary: 12 6.5% 15.1%;
    --secondary-foreground: 60 9.1% 97.8%;
    --muted: 12 6.5% 15.1%;
    --muted-foreground: 24 5.4% 63.9%;
    --accent: 12 6.5% 15.1%;
    --accent-foreground: 60 9.1% 97.8%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 60 9.1% 97.8%;
    --border: 12 6.5% 15.1%;
    --input: 12 6.5% 15.1%;
    --ring: 24 5.7% 82.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

/* Custom theme utility classes for easier styling */
@layer utilities {
  /* Text styling utilities */
  .text-primary-theme {
    color: var(--textPrimary, theme('colors.theme-text-primary'));
  }
  .text-secondary-theme {
    color: var(--textSecondary, theme('colors.theme-text-secondary'));
  }
  
  /* Background styling utilities */
  .bg-surface {
    background-color: var(--surface, theme('colors.theme-surface'));
  }
  
  /* Border styling utilities */
  .border-theme {
    border-color: var(--border-color, theme('colors.theme-border'));
  }
  
  /* Shadow utilities */
  .shadow-theme-sm {
    box-shadow: var(--shadow-sm, theme('boxShadow.theme-sm'));
  }
  .shadow-theme-md {
    box-shadow: var(--shadow-md, theme('boxShadow.theme-md'));
  }
  
  /* Spacing helper classes */
  .p-theme-xs { padding: var(--spacing-xs, theme('spacing.theme-xs')); }
  .p-theme-sm { padding: var(--spacing-sm, theme('spacing.theme-sm')); }
  .p-theme-md { padding: var(--spacing-md, theme('spacing.theme-md')); }
  .p-theme-lg { padding: var(--spacing-lg, theme('spacing.theme-lg')); }
  .p-theme-xl { padding: var(--spacing-xl, theme('spacing.theme-xl')); }
  
  .m-theme-xs { margin: var(--spacing-xs, theme('spacing.theme-xs')); }
  .m-theme-sm { margin: var(--spacing-sm, theme('spacing.theme-sm')); }
  .m-theme-md { margin: var(--spacing-md, theme('spacing.theme-md')); }
  .m-theme-lg { margin: var(--spacing-lg, theme('spacing.theme-lg')); }
  .m-theme-xl { margin: var(--spacing-xl, theme('spacing.theme-xl')); }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

**layout.tsx** - 

import "./globals.css";
import { AuthProvider } from "../lib/contexts/AuthContext";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Tenant Management System",
  description: "A comprehensive system for managing tenants, leases, and rent payments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}


**tailwind.config.ts** - 


import type { Config } from "tailwindcss";
import { theme } from "./src/theme/theme";

const tailwindConfig: Config = {
    content: ["./src/**/*.{js,ts,jsx,tsx,mdx,json}"],
  theme: {
  	extend: {
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'theme-sm': theme.borderRadius.sm,
  			'theme-md': theme.borderRadius.md,
  			'theme-lg': theme.borderRadius.lg
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			'theme-primary': theme.colors.primary,
  			'theme-secondary': theme.colors.secondary,
  			'theme-background': theme.colors.background,
  			'theme-surface': theme.colors.surface,
  			'theme-text-primary': theme.colors.textPrimary,
  			'theme-text-secondary': theme.colors.textSecondary,
  			'theme-error': theme.colors.error
  		},
  		spacing: {
  			'theme-xs': theme.spacing.xs,
  			'theme-sm': theme.spacing.sm,
  			'theme-md': theme.spacing.md,
  			'theme-lg': theme.spacing.lg,
  			'theme-xl': theme.spacing.xl
  		},
  		fontFamily: {
  			sans: [theme.typography.fontFamily.sans],
  			mono: [theme.typography.fontFamily.mono]
  		},
  		fontSize: {
  			'theme-xs': theme.typography.fontSize.xs,
  			'theme-sm': theme.typography.fontSize.sm,
  			'theme-base': theme.typography.fontSize.base,
  			'theme-lg': theme.typography.fontSize.lg,
  			'theme-xl': theme.typography.fontSize.xl,
  			'theme-2xl': theme.typography.fontSize['2xl'],
  			'theme-3xl': theme.typography.fontSize['3xl'],
  			'theme-4xl': theme.typography.fontSize['4xl']
  		},
  		boxShadow: {
  			'theme-sm': theme.shadows.sm,
  			'theme-md': theme.shadows.md
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
  darkMode: 'class'
};
export default tailwindConfig;



**postcss.config.mjs (it did exist before)**

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;

**package.json** -

{
  "name": "template-2",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@react-oauth/google": "^0.12.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "file-saver": "^2.0.5",
    "firebase": "^10.13.0",
    "firebase-admin": "^13.2.0",
    "framer-motion": "^11.18.2",
    "googleapis": "^144.0.0",
    "lucide-react": "^0.436.0",
    "next": "14.2.7",
    "next-themes": "^0.4.6",
    "react": "^18",
    "react-dom": "^18",
    "react-markdown": "^9.0.1",
    "recharts": "^2.15.1",
    "sonner": "^2.0.1",
    "tailwind-merge": "^3.0.2",
    "tailwindcss-animate": "^1.0.7",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.7",
    "@types/node": "^20.17.19",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.7",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}