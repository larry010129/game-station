/** Theme variable as a Tailwind colour that still honours `/50`-style opacity. */
const tok = (v) => ({ opacityValue }) =>
  opacityValue === undefined || opacityValue === "1"
    ? `var(${v})`
    : `color-mix(in srgb, var(${v}) calc(${opacityValue} * 100%), transparent)`;
/** @type {import('tailwindcss').Config} */
export default {
  // Content-limited: only Event Manager / calendar files generate utilities.
  // No `important` wrapper — Radix dialogs/menus portal to body.
  // Preflight off: station charcoal CSS must not be reset globally.
  corePlugins: { preflight: false },
  darkMode: ["class"],
  content: [
    "./src/components/ui/**/*.{ts,tsx}",
    "./src/cards/CalendarPage.tsx",
    "./src/styles/calendar-tw.css",
  ],
  theme: {
    extend: {
      // Semantic tokens read the live station theme (set on <html> by palette.ts),
      // so the calendar re-skins with every theme, light or dark.
      colors: {
        border: tok("--edge"),
        input: tok("--edge-2"),
        ring: tok("--text"),
        background: tok("--bg"),
        foreground: tok("--text"),
        caution: tok("--orange"),
        primary: { DEFAULT: tok("--text"), foreground: tok("--on-text") },
        secondary: { DEFAULT: tok("--wash-2"), foreground: tok("--text") },
        destructive: { DEFAULT: tok("--red"), foreground: tok("--on-red") },
        muted: { DEFAULT: tok("--wash"), foreground: tok("--dim") },
        accent: { DEFAULT: tok("--glass-hi"), foreground: tok("--text") },
        popover: { DEFAULT: tok("--glass-solid"), foreground: tok("--text") },
        card: { DEFAULT: tok("--glass-solid"), foreground: tok("--text") },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-from-top-1": {
          from: { transform: "translateY(-0.25rem)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-top-2": {
          from: { transform: "translateY(-0.5rem)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "in": "fade-in 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in-from-top-1": "slide-in-from-top-1 0.2s ease-out",
        "slide-in-from-top-2": "slide-in-from-top-2 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
