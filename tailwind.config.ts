import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '20px',
        md: '32px',
      },
      screens: {
        '2xl': '1200px',
      },
    },
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-alt': 'var(--bg-alt)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-tint': 'var(--accent-tint)',
        wa: 'var(--wa)',
        'wa-hover': 'var(--wa-hover)',
        error: 'var(--error)',
        success: 'var(--success)',
        marker: 'var(--marker-bg)',
        'marker-ink': 'var(--marker-ink)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '10px',
      },
      maxWidth: {
        container: '1200px',
      },
      spacing: {
        18: '4.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
