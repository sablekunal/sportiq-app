/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sport: {
          orange: '#f97316',
          'orange-dark': '#c2410c',
          'orange-light': '#ffedd5',
          navy: '#0f172a',
          'navy-light': '#1e293b',
          midnight: '#0b1120',
          pitch: '#10b981',
          trophy: '#f59e0b',
          cardinal: '#ef4444',
          surface: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-orange': '0 0 25px -5px rgba(249, 115, 22, 0.4)',
        'glow-pitch': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'stadium': '0 20px 40px -15px rgba(15, 23, 42, 0.25)',
      },
      keyframes: {
        pulseFast: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.95)' },
        },
        coinFlip: {
          '0%': { transform: 'rotateY(0deg) scale(1)' },
          '50%': { transform: 'rotateY(900deg) scale(1.3)' },
          '100%': { transform: 'rotateY(1800deg) scale(1)' },
        }
      },
      animation: {
        'pulse-fast': 'pulseFast 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'coin-flip': 'coinFlip 2s cubic-bezier(0.15, 0.9, 0.2, 1) forwards',
      }
    },
  },
  plugins: [],
}
