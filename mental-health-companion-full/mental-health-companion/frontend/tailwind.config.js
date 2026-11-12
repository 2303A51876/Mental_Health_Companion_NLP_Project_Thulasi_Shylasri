/** Design tokens from Section 5. Red is reserved for emergency / crisis / High-stress / destructive actions. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#2563EB", alt: "#1E90FF", tint: "#F1F7FF" },
        navy: { DEFAULT: "#0B1F3A", deep: "#0F172A" },
        danger: "#DC2626",            // emergency, crisis, High stress, delete ONLY
        calm: "#16A34A",              // Low stress / positive only
        caution: "#D97706",           // Moderate stress only
      },
      borderRadius: { "2xl": "1rem" },
      boxShadow: { soft: "0 4px 24px rgba(11, 31, 58, 0.08)" },
    },
  },
  plugins: [],
};
