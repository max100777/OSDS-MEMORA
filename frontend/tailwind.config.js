/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#F5F0E6',
          900: '#FFFDF7',
          850: '#EEE8DC',
          800: '#E3DCCD',
          750: '#D8D0C0',
          700: '#171717',
          600: '#625E55'
        },
        memora: {
          hit: '#A8DDBB',
          fault: '#F07862',
          warning: '#F5D547',
          ml: '#8B70B6',
          cold: '#3155D9',
          optimal: '#C85655',
          border: '#171717'
        },
        slate: {
          50: '#FFFDF7', 100: '#171717', 200: '#292723', 300: '#49463E',
          400: '#625E55', 500: '#777166', 600: '#8E887C', 700: '#AAA397',
          800: '#D6D0C4', 900: '#E8E2D6', 950: '#171717'
        },
        indigo: {
          100: '#E8ECFF', 200: '#D7DFFF', 300: '#B8C6FF', 400: '#6680E6',
          500: '#3155D9', 600: '#3155D9', 700: '#2444B5', 800: '#233A91',
          900: '#E5EAFE', 950: '#EDF0FF'
        },
        amber: {
          100: '#FFF9D9', 200: '#F9EFBF', 300: '#8A6B00', 400: '#705700',
          500: '#F5D547', 600: '#D8B91F', 700: '#C9A900', 800: '#87710C',
          900: '#F9EFBF', 950: '#FCF7DF'
        },
        emerald: {
          100: '#E7F6EB', 200: '#D5F0DE', 300: '#2F704B', 400: '#246443',
          500: '#4F9A6D', 600: '#367A52', 700: '#A8DDBB', 800: '#78B891',
          900: '#D5F0DE', 950: '#EAF7EE'
        },
        rose: {
          100: '#FCEAE5', 200: '#F8D9D1', 300: '#B7513E', 400: '#A53D2D',
          500: '#F07862', 600: '#E5654D', 700: '#F07862', 800: '#C95340',
          900: '#F8D9D1', 950: '#FCEAE5'
        },
        violet: {
          100: '#F2ECFA', 200: '#E6DDF4', 300: '#7755A8', 400: '#65419A',
          500: '#8B70B6', 600: '#7755A8', 700: '#65419A', 800: '#573987',
          900: '#E6DDF4', 950: '#F2ECFA'
        },
        pink: {
          100: '#FCEAE5', 200: '#F8D9D1', 300: '#A53D2D', 400: '#A53D2D',
          500: '#F07862', 600: '#E5654D', 700: '#C95340', 800: '#A53D2D',
          900: '#F8D9D1', 950: '#FCEAE5'
        },
        cyan: {
          100: '#E8F2FA', 200: '#D9EAF6', 300: '#2D658D', 400: '#245A82',
          500: '#4C91B8', 600: '#34769D', 700: '#286484', 800: '#23566F',
          900: '#D9EAF6', 950: '#E8F2FA'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
