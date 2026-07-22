import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        mist: "rgb(var(--cream) / <alpha-value>)",
        cream: "rgb(var(--cream) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        soft: "rgb(var(--soft) / <alpha-value>)",
        cocoa: "rgb(var(--cocoa) / <alpha-value>)",
        peach: "rgb(var(--peach) / <alpha-value>)",
        meadow: "rgb(var(--accent) / <alpha-value>)",
        leaf: "rgb(var(--accent-strong) / <alpha-value>)",
        clay: "rgb(var(--danger) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
      },
      boxShadow: {
        panel: "0 18px 50px rgb(var(--shadow) / 0.14)",
        float: "0 12px 34px rgb(var(--shadow) / 0.2)",
      },
      borderRadius: {
        app: "1.5rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
