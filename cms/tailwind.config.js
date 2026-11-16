/** @type {import('tailwindcss').Config} */
/* Every colour is `rgb(var(--…-rgb) / <alpha-value>)` so opacity classes such as
   border-border/50 and bg-card/40 are generated. The channels live in tokens.css. */
const c = (name) => `rgb(var(--cms-${name}-rgb) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"),
        surface: c("surface"),
        ink: c("ink"),
        /* Keep `text-muted` as ink-muted (legacy CMS pages). Surface fills use `secondary`. */
        muted: {
          DEFAULT: c("muted"),
          foreground: c("muted"),
        },
        edge: c("edge"),
        accent: {
          DEFAULT: c("surface-raised"),
          foreground: c("ink"),
        },
        background: c("bg"),
        foreground: c("ink"),
        card: {
          DEFAULT: c("surface"),
          foreground: c("ink"),
        },
        primary: {
          DEFAULT: c("accent"),
          foreground: c("accent-fg"),
        },
        secondary: {
          DEFAULT: c("surface-raised"),
          foreground: c("ink"),
        },
        destructive: {
          DEFAULT: c("destructive"),
          foreground: c("danger"),
        },
        border: c("edge"),
        input: c("edge"),
        ring: c("accent"),
        success: c("ok"),
        warning: c("warn"),
        info: c("info"),
        field: {
          DEFAULT: "var(--cms-field-bg)",
          fg: "var(--cms-field-fg)",
          placeholder: "var(--cms-field-placeholder)",
        },
      },
      borderRadius: {
        lg: "var(--cms-radius)",
        md: "calc(var(--cms-radius) - 2px)",
        sm: "calc(var(--cms-radius) - 4px)",
      },
      boxShadow: {
        card: "var(--cms-card-shadow)",
      },
      fontFamily: {
        sans: ["var(--cms-font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
