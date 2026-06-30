/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#171717',
        secondary: '#4d4d4d',
        tertiary: '#666666',
        gray: '#808080',
        accent: '#0072f5',
        background: '#ffffff',
        surface: '#fafafa',
        border: 'rgba(0,0,0,0.08)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
