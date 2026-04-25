/**
 * Chart color constants — must stay in sync with --chart-* vars in src/index.css.
 * Using constants (rather than getComputedStyle) keeps Recharts stroke/fill
 * props stable across renders and avoids DOM reads on every paint.
 */
export const CHART_COLORS = {
  emerald: 'oklch(0.64 0.18 162)',   // chart-1 — growth, positive
  blue:    'oklch(0.60 0.20 240)',   // chart-2 — neutral / informational
  amber:   'oklch(0.78 0.18 78)',    // chart-3 — caution / principal
  red:     'oklch(0.57 0.22 27)',    // chart-4 — loss / interest cost
  violet:  'oklch(0.52 0.16 20)',    // chart-5 — maroon
} as const;
