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
          950: '#060911',
          900: '#0B0F19',
          850: '#111827',
          800: '#172033',
          750: '#1E293B',
          700: '#334155',
          600: '#475569'
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
