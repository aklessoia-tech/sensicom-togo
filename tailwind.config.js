/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f4',
          100: '#d4ebe4',
          200: '#a9d7c9',
          300: '#77bda9',
          400: '#48a189',
          500: '#2d8570',
          600: '#1f6a5a',
          700: '#1a5449',
          800: '#17433b',
          900: '#123631',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
