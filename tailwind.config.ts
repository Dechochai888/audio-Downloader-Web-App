import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#dbeefe',
          200: '#bfe0fd',
          300: '#93c9fb',
          400: '#60a9f7',
          500: '#3b86f2',
          600: '#2567e6',
          700: '#1f52c8',
          800: '#1e46a0',
          900: '#1d3c82'
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
