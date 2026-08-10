/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Charte bleu ciel / blanc / rouge. L'échelle garde les mêmes crans que
        // l'ancienne famille verte, si bien que les usages existants
        // (brand-600 pour l'action, brand-50 pour les fonds actifs) restent valables.
        brand: {
          50: '#eff8fe',
          100: '#dcf0fc',
          200: '#b9e0f7',
          300: '#8fcbee',
          400: '#5cb3e4',
          500: '#2f9bd8', // éclairci, réservé au thème sombre
          600: '#1b7fbf', // primaire
          700: '#10598a', // survol et aplats
          800: '#0d4b73',
          900: '#0b3c5d',
        },
        // Accent, non une couleur d'action : amorces en capitales et filets
        // seulement. Le rouge d'erreur reste le red-600 de Tailwind (#dc2626).
        accent: '#d92440',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
