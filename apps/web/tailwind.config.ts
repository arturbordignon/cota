import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

// Colors read RGB channels from globals.css so opacity modifiers work.
const token = (name: string) => `rgb(var(--rgb-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        xl: "2rem",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        background: token("background"),
        surface: {
          DEFAULT: token("surface"),
          muted: token("surface-muted"),
          sunken: token("surface-sunken"),
        },
        muted: token("muted"),
        border: token("border"),
        outline: token("outline"),
        primary: {
          DEFAULT: token("primary"),
          hover: token("primary-hover"),
          strong: token("primary-strong"),
          soft: token("primary-soft"),
          tint: token("primary-tint"),
          foreground: token("on-primary"),
        },
        accent: token("accent"),
        ink: {
          DEFAULT: token("ink"),
          muted: token("ink-muted"),
          subtle: token("muted"),
        },
        success: {
          DEFAULT: token("success"),
          soft: token("success-soft"),
        },
        warning: {
          DEFAULT: token("warning"),
          soft: token("warning-soft"),
        },
        info: {
          DEFAULT: token("info"),
          soft: token("info-soft"),
        },
        danger: {
          DEFAULT: token("danger"),
          soft: token("danger-soft"),
        },
      },
      fontFamily: {
        display: ["var(--font-display)", ...defaultTheme.fontFamily.sans],
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "0.875rem",
        "3xl": "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(27 31 36 / 0.04)",
        raised: "0 12px 32px -12px rgb(27 31 36 / 0.22), 0 2px 6px -2px rgb(27 31 36 / 0.08)",
        press: "inset 0 -2px 0 rgb(0 0 0 / 0.12)",
      },
      spacing: {
        15: "3.75rem",
      },
      transitionDuration: {
        250: "250ms",
      },
      keyframes: {
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "dialog-in": {
          from: { opacity: "0", transform: "translateY(6px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "drawer-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "overlay-in": "overlay-in 160ms ease-out",
        "dialog-in": "dialog-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "pop-in": "pop-in 140ms ease-out",
        "drawer-in": "drawer-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
