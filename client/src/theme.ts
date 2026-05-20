export type AppColorMode = "light" | "dark";

export type AppDataTheme = "finance-light" | "finance-dark";

const APP_DATA_THEME_BY_MODE: Record<AppColorMode, AppDataTheme> = {
  light: "finance-light",
  dark: "finance-dark",
};

export interface AppTheme {
  colorScheme: "light" | "dark";
  dataTheme: AppDataTheme;
  rootClass: AppColorMode;
  tokens: {
    primary: string;
    canvas: string;
    surfaceCard: string;
    textPrimary: string;
    textBody: string;
    borderHairline: string;
    tradingUp: string;
    tradingDown: string;
  };
}

export function normalizeColorMode(value: string | null | undefined): AppColorMode {
  return value === "dark" ? "dark" : "light";
}

export function createAppTheme(colorMode: AppColorMode): AppTheme {
  const isDark = colorMode === "dark";
  return {
    colorScheme: colorMode,
    dataTheme: APP_DATA_THEME_BY_MODE[colorMode],
    rootClass: colorMode,
    tokens: {
      primary: "var(--color-primary)",
      canvas: isDark ? "var(--color-canvas-dark)" : "var(--color-canvas-light)",
      surfaceCard: isDark ? "var(--color-surface-card-dark)" : "var(--color-surface-soft-light)",
      textPrimary: isDark ? "var(--color-on-dark)" : "var(--color-body-on-light)",
      textBody: isDark ? "var(--color-body)" : "var(--color-body-on-light)",
      borderHairline: isDark ? "var(--color-hairline-on-dark)" : "var(--color-hairline-on-light)",
      tradingUp: "var(--color-trading-up)",
      tradingDown: "var(--color-trading-down)",
    },
  };
}

export function applyAppTheme(colorMode: AppColorMode, root: HTMLElement = document.documentElement): void {
  const theme = createAppTheme(colorMode);

  root.classList.toggle("light", colorMode === "light");
  root.classList.toggle("dark", colorMode === "dark");
  root.dataset.theme = theme.dataTheme;
  root.style.colorScheme = theme.colorScheme;
}

export function readStoredColorMode(storage: Storage = localStorage): AppColorMode {
  return normalizeColorMode(storage.getItem("colorMode"));
}

export function applyStoredAppTheme(): void {
  if (typeof document === "undefined") return;

  try {
    applyAppTheme(readStoredColorMode());
  } catch {
    applyAppTheme("light");
  }
}
