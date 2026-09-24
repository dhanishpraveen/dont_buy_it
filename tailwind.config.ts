import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        line: 'var(--color-line)',
        bark: 'var(--color-bark)',
        sage: 'var(--color-sage)',
        'sage-soft': 'var(--color-sage-soft)',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        handwritten: ['Caveat', 'cursive'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
    },
  },
  plugins: [],
} satisfies Config;