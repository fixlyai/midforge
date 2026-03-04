import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0d0a1e',
          dark: '#1a0a2e',
          amber: '#F39C12',
          red: '#E74C3C',
          green: '#27AE60',
          wheat: '#F5DEB3',
          purple: '#7B68EE',
          blue: '#4A90D9',
          brown: '#8B7355',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
