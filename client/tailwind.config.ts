import type { Config } from "tailwindcss";
import daisyui from "daisyui";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-active": "var(--color-primary-active)",
        "primary-disabled": "var(--color-primary-disabled)",
        ink: "var(--color-ink)",
        body: "var(--color-body)",
        "body-on-light": "var(--color-body-on-light)",
        muted: "var(--color-muted)",
        "muted-strong": "var(--color-muted-strong)",
        "hairline-on-light": "var(--color-hairline-on-light)",
        "hairline-on-dark": "var(--color-hairline-on-dark)",
        "border-strong": "var(--color-border-strong)",
        "canvas-light": "var(--color-canvas-light)",
        "canvas-dark": "var(--color-canvas-dark)",
        "surface-card-dark": "var(--color-surface-card-dark)",
        "surface-elevated-dark": "var(--color-surface-elevated-dark)",
        "surface-soft-light": "var(--color-surface-soft-light)",
        "surface-strong-light": "var(--color-surface-strong-light)",
        "on-primary": "var(--color-on-primary)",
        "on-dark": "var(--color-on-dark)",
        "trading-up": "var(--color-trading-up)",
        "trading-down": "var(--color-trading-down)",
        "accent-turquoise": "var(--color-accent-turquoise)",
        info: "var(--color-info)",
        "info-ring": "var(--color-info-ring)",
        canvas: "var(--color-canvas)",
        "surface-card": "var(--color-surface-card)",
        "surface-elevated": "var(--color-surface-elevated)",
        "surface-soft": "var(--color-surface-soft)",
        "surface-strong": "var(--color-surface-strong)",
        "text-primary": "var(--color-text-primary)",
        "text-body": "var(--color-text-body)",
        "border-hairline": "var(--color-border-hairline)",
      },
      spacing: {
        xxs: "var(--space-xxs)",
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        xxl: "var(--space-xxl)",
        section: "var(--space-section)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      fontFamily: {
        sans: ["var(--font-family-base)"],
        display: ["var(--font-family-display)"],
        numeric: ["var(--font-family-numeric)"],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light"],
    logs: false,
  },
};

export default config;
