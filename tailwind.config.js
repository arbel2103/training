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
      },
      fontFamily: {
        sans: ['Assistant', 'system-ui', 'sans-serif'],
        display: ['"Frank Ruhl Libre"', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,28,26,0.04), 0 8px 24px -12px rgba(28,28,26,0.12)',
        pop: '0 12px 40px -8px rgba(28,28,26,0.22)',
      },
    },
  },
  plugins: [],
}
