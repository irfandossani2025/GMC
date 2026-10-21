/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#185b73',
          50: '#eef6f8',
          100: '#d6ebf0',
          200: '#aed6e0',
          300: '#7ebdcd',
          400: '#4a9db3',
          500: '#185b73',
          600: '#134b5f',
          700: '#0f3c4d',
          800: '#0b2d3a',
          900: '#081f28',
        },
        'primary-foreground': '#ffffff',
        secondary: '#f7f4ef',
        accent: {
          DEFAULT: '#1d9a9b',
          50: '#e7f8f7',
          100: '#c8eeec',
          200: '#98dedb',
          300: '#65c9c6',
          400: '#3bb2af',
          500: '#1d9a9b',
          600: '#177d7f',
          700: '#136264',
          800: '#0f4d4f',
          900: '#0a3536',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        violet: '#7c5cbf',
        coral: '#ef7f6a',
      },
      fontFamily: {
        sans: ['Avenir Next', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
      spacing: {
        card: '350px',
      },
      boxShadow: {
        glow: '0 20px 45px -15px rgba(24, 91, 115, 0.35)',
      },
    },
  },
  plugins: [],
};
