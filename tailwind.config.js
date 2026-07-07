/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0d0e12",
          panel: "#151821",
          border: "#262936",
          accent: "#4f46e5",
          accentLight: "#6366f1",
          terminal: "#1e2230",
          yellow: "#eab308",
          red: "#ef4444",
          green: "#22c55e",
          blue: "#3b82f6",
        }
      },
      boxShadow: {
        glow: "0 0 15px rgba(99, 102, 241, 0.25)",
        cyberGlow: "0 0 20px rgba(79, 70, 229, 0.35)",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
        sans: ["Outfit", "Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
