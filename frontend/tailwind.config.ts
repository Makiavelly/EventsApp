import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        mist: "#f6f7f4",
        meadow: "#1f8a5b",
        leaf: "#2fb879",
        clay: "#d94f45",
      },
      boxShadow: {
        panel: "0 16px 40px rgba(23, 23, 23, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
