/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#0071e3',
          'blue-hover': '#0077ed',
          'blue-light': '#e8f1fd',
          gray: '#f5f5f7',
          'gray-2': '#e8e8ed',
          'gray-3': '#d2d2d7',
          'gray-4': '#86868b',
          'gray-5': '#6e6e73',
          text: '#1d1d1f',
          green: '#34c759',
          orange: '#ff9500',
          red: '#ff3b30',
          dark: '#1c1c1e',
          'dark-2': '#2c2c2e',
          'dark-3': '#3a3a3c',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'apple': '0 2px 12px rgba(0,0,0,0.08)',
        'apple-md': '0 4px 20px rgba(0,0,0,0.10)',
        'apple-lg': '0 8px 40px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'apple': '12px',
        'apple-sm': '8px',
        'apple-lg': '18px',
        'apple-xl': '24px',
      },
    },
  },
  plugins: [],
};
