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
        industrial: {
          950: 'rgb(var(--color-industrial-950) / <alpha-value>)',
          900: 'rgb(var(--color-industrial-900) / <alpha-value>)',
          850: 'rgb(var(--color-industrial-850) / <alpha-value>)',
          800: 'rgb(var(--color-industrial-800) / <alpha-value>)',
          700: 'rgb(var(--color-industrial-700) / <alpha-value>)',
          600: 'rgb(var(--color-industrial-600) / <alpha-value>)',
          500: 'rgb(var(--color-industrial-500) / <alpha-value>)',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          glow: '#00f0ff',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          glow: '#00ff88',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          glow: '#ffaa00',
        },
        rose: {
          500: '#f43f5e',
          600: '#e11d48',
          glow: '#ff2a55',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.35)',
        'glow-emerald': '0 0 15px -3px rgba(16, 185, 129, 0.35)',
        'glow-amber': '0 0 15px -3px rgba(245, 158, 11, 0.35)',
        'glow-rose': '0 0 15px -3px rgba(244, 63, 94, 0.45)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
