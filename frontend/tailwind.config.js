/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'gradient-card':    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-green':   'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        'gradient-orange':  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-blue':    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'gradient-gold':    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
        'gradient-dark':    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      },
      boxShadow: {
        'card':  '0 4px 24px -2px rgba(79,70,229,0.10), 0 2px 8px -2px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 40px -4px rgba(79,70,229,0.18), 0 4px 16px -4px rgba(0,0,0,0.10)',
        'glow':  '0 0 20px rgba(99,102,241,0.35)',
        'nav':   '0 2px 20px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },                          '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
