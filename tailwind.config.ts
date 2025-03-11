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
            'theme-lg': theme.borderRadius.lg,
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
            'theme-error': theme.colors.error,
  		},
        spacing: {
            'theme-xs': theme.spacing.xs,
            'theme-sm': theme.spacing.sm,
            'theme-md': theme.spacing.md,
            'theme-lg': theme.spacing.lg,
            'theme-xl': theme.spacing.xl,
        },
        fontFamily: {
            sans: [theme.typography.fontFamily.sans],
            mono: [theme.typography.fontFamily.mono],
        },
        fontSize: {
            'theme-xs': theme.typography.fontSize.xs,
            'theme-sm': theme.typography.fontSize.sm,
            'theme-base': theme.typography.fontSize.base,
            'theme-lg': theme.typography.fontSize.lg,
            'theme-xl': theme.typography.fontSize.xl,
            'theme-2xl': theme.typography.fontSize['2xl'],
            'theme-3xl': theme.typography.fontSize['3xl'],
            'theme-4xl': theme.typography.fontSize['4xl'],
        },
        boxShadow: {
            'theme-sm': theme.shadows.sm,
            'theme-md': theme.shadows.md,
        },
  	}
  },
  plugins: [require("tailwindcss-animate")],
  darkMode: 'class',
};
export default tailwindConfig;
