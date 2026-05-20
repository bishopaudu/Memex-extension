import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}', './entrypoints/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          500: '#4f6ef7',
          600: '#3b5bf5',
          700: '#2d4ae0',
        }
      }
    }
  },
  plugins: [],
} satisfies Config
