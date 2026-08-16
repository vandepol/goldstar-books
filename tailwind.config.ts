import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16283D',
        slate: '#3C5068',
        muted: '#6B7C90',
        page: '#FFFDF5',
        sand: '#EFE7D6',
        parchment: '#F3E7CB',
        line: '#E2D7BF',
        leaf: '#1E7A4B',
        gold: { DEFAULT: '#F2B33D', deep: '#C98A16' },
        sea: { DEFAULT: '#155E86', deep: '#0C3B5C' },
      },
      fontFamily: {
        // The reading surface is not a place to express a brand.
        reading: ['Verdana', 'Tahoma', 'Trebuchet MS', 'sans-serif'],
        // Adult-facing UI.
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: { xl2: '18px', xl3: '22px' },
    },
  },
  plugins: [],
} satisfies Config;
