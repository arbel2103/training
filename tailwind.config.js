/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        strength: 'rgb(var(--c-strength) / <alpha-value>)',
        run: 'rgb(var(--c-run) / <alpha-value>)',
        bike: 'rgb(var(--c-bike) / <alpha-value>)',
        swim: 'rgb(var(--c-swim) / <alpha-value>)',
        other: 'rgb(var(--c-other) / <alpha-value>)',
        // palette carried over from the finance app (ink → fink to avoid
        // colliding with TriLife's single `ink` token); retuned in the
        // design-unification phase.
        sand: { 50: '#faf9f6', 100: '#f4f2ec', 200: '#e9e5db' },
        fink: { 900: '#1c1b19', 700: '#3d3b37', 500: '#6b6862', 400: '#8f8c85' },
        sage: {
          50: '#eef2ee',
          100: '#dce6dc',
          400: '#7d9b7d',
          500: '#5f7f5f',
          600: '#4c684c',
          700: '#3c523c',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'system-ui', 'sans-serif'],
        display: ['Rubik', 'Heebo', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,17,16,0.04)',
        pop: '0 16px 48px -12px rgba(17,17,16,0.25)',
        soft: '0 1px 3px rgba(28,27,25,0.06)',
      },
    },
  },
  plugins: [],
}
