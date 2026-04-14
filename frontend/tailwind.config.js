/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#121212',
        surface: '#1E1E1E',
        input: '#2C2C2C',
        text: '#E0E0E0',
        muted: '#9E9E9E',
        accent: '#FFFFFF',
      },
    },
  },
  plugins: [],
};

