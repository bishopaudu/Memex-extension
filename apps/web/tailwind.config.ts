import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--s0)',
          1: 'var(--s1)',
          2: 'var(--s2)',
          3: 'var(--s3)',
          4: 'var(--s4)',
          5: 'var(--s5)',
          6: 'var(--s6)',
        },
        ink: {
          1: 'var(--ink1)',
          2: 'var(--ink2)',
          3: 'var(--ink3)',
          4: 'var(--ink4)',
          5: 'var(--ink5)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          dim:     'var(--brand-dim)',
          bright:  'var(--brand-bright)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
