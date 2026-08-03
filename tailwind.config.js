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
        sans: ['Heebo', 'system-ui', 'sans-serif'],
        display: ['Rubik', 'Heebo', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,17,16,0.04)',
        pop: '0 16px 48px -12px rgba(17,17,16,0.25)',
      },
    },
  },
  plugins: [],
}
