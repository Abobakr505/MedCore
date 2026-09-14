import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#EDF7FF",
          100: "#D8F0FF",
          200: "#B8E4FF",
          300: "#86CEF9",
          400: "#5CA7F0",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E3A8A",
          900: "#0F3D5E",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 61, 94, 0.08)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up .5s ease-out both",
        shimmer: "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [],
};

export default config;
