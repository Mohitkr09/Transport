/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // enables dark mode toggling by adding `.dark` class
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 🌀 ALL CUSTOM ANIMATIONS
      keyframes: {
        scaleIn: {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(30px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".65" },
        },
      },
      animation: {
        scaleIn: "scaleIn 0.3s ease-out",
        fadeIn: "fadeIn 0.5s ease-out",
        slideUp: "slideUp 0.45s ease-out",
        slideInRight: "slideInRight 0.45s ease-out",
        pulseSlow: "pulseSlow 3s ease-in-out infinite",
      },

      // 🌈 BRAND COLORS
      colors: {
        primary: "#6D28D9",     // Purple brand
        purpleDark: "#4C1D95",
      },

      // 🎨 OPTIONAL GLASS EFFECT UTILITIES
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};