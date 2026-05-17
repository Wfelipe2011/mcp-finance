import { createTheme } from "@mui/material";

export type AppColorMode = "light" | "dark";

export function createAppTheme(colorMode: AppColorMode) {
  const isLight = colorMode === "light";
  const primaryMain = "var(--color-primary)";
  const onPrimary = "var(--color-on-primary)";
  const errorMain = "var(--color-trading-down)";
  const successMain = "var(--color-trading-up)";
  const onDark = "var(--color-on-dark)";

  return createTheme({
    palette: {
      mode: colorMode,
      primary: {
        main: primaryMain,
        light: primaryMain,
        dark: primaryMain,
        contrastText: onPrimary,
      },
      error: {
        main: errorMain,
        light: errorMain,
        dark: errorMain,
        contrastText: onDark,
      },
      success: {
        main: successMain,
        light: successMain,
        dark: successMain,
        contrastText: onDark,
      },
      background: {
        default: isLight ? "var(--color-canvas-light)" : "var(--color-canvas-dark)",
        paper: isLight ? "var(--color-surface-soft-light)" : "var(--color-surface-card-dark)",
      },
      text: {
        primary: isLight ? "var(--color-body-on-light)" : "var(--color-on-dark)",
        secondary: isLight ? "var(--color-muted)" : "var(--color-body)",
      },
    },
    typography: {
      fontFamily:
        "\"BinanceNova\", var(--font-family-base), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { fontWeight: 600, textTransform: "none" },
    },
    shape: {
      borderRadius: 6,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "var(--radius-md)",
            textTransform: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: "var(--radius-lg)",
            backgroundImage: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: "var(--radius-lg)",
            backgroundColor: isLight
              ? "var(--color-surface-soft-light)"
              : "var(--color-surface-card-dark)",
          },
        },
      },
    },
  });
}
