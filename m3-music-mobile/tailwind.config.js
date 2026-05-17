/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#121212',
        surface: '#181818',
        primary: '#1DB954',
        textMain: '#FFFFFF',
        textSub: '#B3B3B3',
      }
    },
  },
  plugins: [],
}
