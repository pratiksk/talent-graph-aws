import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background:           'hsl(var(--background) / <alpha-value>)',
        foreground:           'hsl(var(--foreground) / <alpha-value>)',
        popover:              'hsl(var(--popover) / <alpha-value>)',
        'popover-foreground': 'hsl(var(--popover-foreground) / <alpha-value>)',
        'muted-foreground':   'hsl(var(--muted-foreground) / <alpha-value>)',
        border:               'hsl(var(--border) / <alpha-value>)',
        accent:               'hsl(var(--accent) / <alpha-value>)',
      },
    },
  },
  plugins: [],
} satisfies Config
