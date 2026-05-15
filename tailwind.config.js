/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Logo-derived palette.
        // accent  = #6191A5 (the steel-blue of the chart bars)
        // accent2 = #2A3B47 (the deep navy of the wordmark)
        paper:    '#FFFFFF',
        cream:    '#F7F9FA',
        line:     '#E2E6EA',
        line2:    '#EDF0F2',
        ink:      '#1F2D38',
        muted:    '#5E6B75',
        muted2:   '#94A0AA',
        accent:   '#6191A5',
        accent2:  '#2A3B47',
        chalk:    '#EEF2F4',
        ok:       '#3F8060',
        bad:      '#A0594B',
        cool:     '#7FA899',
        // Iteration 3: distinct filter-panel tone
        railbg:   '#EEF3F6',
        railedge: '#D5DFE5',
      },
      boxShadow: {
        soft: '0 1px 0 rgba(31,45,56,0.04), 0 1px 2px rgba(31,45,56,0.05)',
        card: '0 1px 0 rgba(31,45,56,0.05), 0 2px 6px rgba(31,45,56,0.07)',
        pop:  '0 10px 30px -10px rgba(31,45,56,0.20), 0 6px 14px -6px rgba(31,45,56,0.12)',
        rail: 'inset 0 0 0 1px rgba(42,59,71,0.06), 0 1px 2px rgba(31,45,56,0.04)',
        tab:  '0 4px 14px -4px rgba(97,145,165,0.45), 0 2px 6px -2px rgba(42,59,71,0.18)',
      },
      borderRadius: { 'xl': '0.85rem' },
    },
  },
  plugins: [],
}
