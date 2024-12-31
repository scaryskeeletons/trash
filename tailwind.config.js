/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          background: 'var(--background)',
          card: 'var(--card-background)',
          border: 'var(--border-color)',
          'primary-text': 'var(--primary-text)',
          'secondary-text': 'var(--secondary-text)',
        },
        animation: {
          'fade-in': 'fadeIn 0.3s ease-in',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
        },
      },
    },
    plugins: [],
  }