/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        terminal: {
          bg:           '#08080c',
          card:         '#0f0f17',
          'card-hover': '#13131e',
          border:       'rgba(99,102,241,0.12)',
          'border-hi':  'rgba(99,102,241,0.30)',
          muted:        'rgba(255,255,255,0.04)',
        },
      },
      boxShadow: {
        card:          '0 0 0 1px rgba(255,255,255,0.02), 0 8px 24px rgba(0,0,0,0.4)',
        glow:          '0 0 20px rgba(99,102,241,0.25)',
        'glow-sm':     '0 0 10px rgba(99,102,241,0.15)',
        'glow-emerald':'0 0 20px rgba(52,211,153,0.2)',
        'glow-rose':   '0 0 20px rgba(251,113,133,0.2)',
        'glow-cyan':   '0 0 20px rgba(34,211,238,0.2)',
      },
      animation: {
        'pulse-slow':       'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'gradient-rotate':  'gradient-rotate 8s linear infinite',
        shimmer:            'shimmer 2s linear infinite',
        'fade-in':          'fade-in 0.3s ease-out',
        'slide-up':         'slide-up 0.3s ease-out',
      },
      keyframes: {
        'gradient-rotate': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
