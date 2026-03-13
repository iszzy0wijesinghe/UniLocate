import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#023341',
        accent: '#FD5E02',
        surface: '#F6F4EF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 10px 35px rgba(2, 51, 65, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
