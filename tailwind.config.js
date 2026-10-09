/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Fjalla One"', 'sans-serif'],
      },
      colors: {
        'canvas': 'var(--bg-canvas)',
        'ink': 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'risk-danger': 'var(--risk-danger)',
      },
      fontSize: {
        'caption': ['13px', { lineHeight: '1.1', letterSpacing: '0.12em' }],
        'label': ['14px', { lineHeight: '1.2', letterSpacing: '0.08em' }],
        'body': ['16px', { lineHeight: '1.4' }],
        'h2': ['20px', { lineHeight: '1.2' }],
        'display': ['clamp(96px, 34vw, 132px)', { lineHeight: '0.9' }],
      }
    },
  },
  plugins: [],
}
