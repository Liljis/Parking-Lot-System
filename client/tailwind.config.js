/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ibm: {
          blue: '#0f62fe',
          darkBlue: '#0043ce',
          gray10: '#f4f4f4',
          gray20: '#e0e0e0',
          gray80: '#393939',
          gray90: '#262626',
          gray100: '#161616',
        }
      }
    },
  },
  plugins: [],
}
