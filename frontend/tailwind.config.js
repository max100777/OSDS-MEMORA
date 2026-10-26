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
          950: '#0b0d10',
          900: '#111419',
          850: '#15191f',
          800: '#1a1f27',
          750: '#272e38',
          700: '#374151',
          600: '#4b5563'
        },
        memora: {
          hit: '#10B981',      // Emerald Green
          fault: '#EF4444',    // Coral Red
          warning: '#F59E0B',  // Amber
          ml: '#8B5CF6',       // Electric Violet
          cold: '#3B82F6',     // Cyan Blue
          optimal: '#EC4899',  // Pink/Fuchsia
          border: '#1F293D'
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
