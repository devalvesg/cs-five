import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta CS-FIVE (design oficial)
        cs: {
          ink: "#080b10",      // --bg
          surface: "#11161e",  // --panel
          surface2: "#0c1118", // --panel-2
          foot: "#1a212c",     // --foot
          line: "#222c3a",     // --border
          lineSoft: "#1a2230", // --border-soft
          txt: "#e7edf5",      // --txt
          muted: "#8593a6",    // --muted
          orange: "#e0a93c",   // --gold (acento principal)
          gold: "#e0a93c",
          goldBright: "#f2bd52",
          blue: "#4a9fe0",
          red: "#cf5340",
          green: "#4fae54",
        },
      },
      fontFamily: {
        display: ["var(--font-oxanium)", "sans-serif"],
        sans: ["var(--font-barlow)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
