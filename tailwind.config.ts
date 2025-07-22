import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // You can add custom colors here if needed
      },
      fontSize: {
        'base': '1.125rem', // 18px
        'sm': '1rem',      // 16px
        'xs': '0.875rem',  // 14px
        'lg': '1.25rem',   // 20px
        'xl': '1.5rem',    // 24px
        '2xl': '1.875rem', // 30px
        '3xl': '2.25rem',  // 36px
      },
      spacing: {
        '1': '0.375rem',   // 6px
        '2': '0.75rem',    // 12px
        '3': '1rem',       // 16px
        '4': '1.5rem',     // 24px
        '5': '2rem',       // 32px
        '6': '2.5rem',     // 40px
        '8': '3rem',       // 48px
        '10': '4rem',      // 64px
        '12': '5rem',      // 80px
      },
      height: {
        'input': '3rem',   // 48px
        'button': '3rem',  // 48px
      },
      minHeight: {
        'input': '3rem',   // 48px
        'button': '3rem',  // 48px
      },
      padding: {
        'input': '1rem',   // 16px
        'button': '1rem 1.5rem', // 16px 24px
      },
    },
  },
  plugins: [],
};

export default config; 