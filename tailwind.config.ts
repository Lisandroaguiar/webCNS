import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "cronopios-pink": "#FE26A7",
        "cronopios-magenta": "#F608B8",
        "cronopios-green": "#19F094",
        "cronopios-ink": "#221E21",
        "cronopios-paper": "#F3EDEE",
        ink: "#000000",
        paper: "#F4F1EA",
        lime: "#D9F917",
        fuchsia: "#FF2A7A",
        cyan: "#00F0FF",
        cream: "#F4F1EA",
        coral: "#FF2A7A",
        lilac: "#c7b9ff",
        sage: "#b9d7c2"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px rgba(0,0,0,1)",
        "brutal-lg": "8px 8px 0px 0px rgba(0,0,0,1)"
      }
    }
  },
  plugins: []
};

export default config;
