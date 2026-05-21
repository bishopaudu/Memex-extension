import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark surface layers — each step slightly lighter
        surface: {
          0: '#0a0a0a',  // page background
          1: '#0d0d0d',  // main content area
          2: '#111111',  // sidebar, cards
          3: '#161616',  // inputs, hover states
          4: '#1e1e1e',  // borders
          5: '#252525',  // subtle borders
          6: '#2a2a2a',  // disabled
        },
        // Text layers
        ink: {
          1: '#e2e2e2',  // primary text
          2: '#999999',  // secondary text
          3: '#666666',  // muted text
          4: '#444444',  // very muted
          5: '#333333',  // barely visible
        },
        // Brand
        brand: {
          DEFAULT: '#4f6ef7',
          dim:     '#1a1f3a',
          bright:  '#7b93ff',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
