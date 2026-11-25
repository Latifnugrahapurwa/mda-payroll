import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { red: "#f32616", orange: "#ff8a00", yellow: "#ffc400", ink: "#101114" },
      },
      boxShadow: { soft: "0 12px 35px rgba(15, 23, 42, .07)" },
    },
  },
  plugins: [],
};

export default config;
