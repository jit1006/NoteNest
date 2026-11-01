import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { brand: colors.indigo, accent: colors.violet },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -8px rgb(15 23 42 / 0.10)',
        lift: '0 2px 4px rgb(15 23 42 / 0.05), 0 16px 36px -10px rgb(79 70 229 / 0.25)',
        glow: '0 10px 40px -10px rgb(99 102 241 / 0.55)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}
