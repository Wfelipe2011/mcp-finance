import { describe, expect, it } from "bun:test";
import { createAppTheme } from "./theme";

describe("ponte MUI para tokens CSS", () => {
  it("mapeia primary/error/success para tokens", () => {
    const theme = createAppTheme("dark");

    expect(theme.palette.primary.main).toBe("var(--color-primary)");
    expect(theme.palette.error.main).toBe("var(--color-trading-down)");
    expect(theme.palette.success.main).toBe("var(--color-trading-up)");
  });

  it("mantém modo light sem quebrar e preserva mode", () => {
    const theme = createAppTheme("light");

    expect(theme.palette.mode).toBe("light");
    expect(theme.palette.background.default).toBe("var(--color-canvas-light)");
    expect(theme.palette.background.paper).toBe("var(--color-surface-soft-light)");
  });

  it("mapeia tokens de texto", () => {
    const darkTheme = createAppTheme("dark");
    const lightTheme = createAppTheme("light");

    expect(darkTheme.palette.text.primary).toBe("var(--color-on-dark)");
    expect(darkTheme.palette.text.secondary).toBe("var(--color-body)");
    expect(lightTheme.palette.text.primary).toBe("var(--color-body-on-light)");
    expect(lightTheme.palette.text.secondary).toBe("var(--color-muted)");
  });

  it("define fontFamily com token BinanceNova e fallback system-ui", () => {
    const theme = createAppTheme("dark");

    expect(theme.typography.fontFamily).toContain("BinanceNova");
    expect(theme.typography.fontFamily).toContain("system-ui");
  });

  it("aplica shape e overrides chave de Button/Card/Paper", () => {
    const theme = createAppTheme("dark");

    expect(theme.shape.borderRadius).toBe(6);
    expect(theme.components?.MuiButton?.styleOverrides?.root).toMatchObject({
      borderRadius: "var(--radius-md)",
    });
    expect(theme.components?.MuiCard?.styleOverrides?.root).toMatchObject({
      borderRadius: "var(--radius-lg)",
    });
    expect(theme.components?.MuiPaper?.styleOverrides?.root).toMatchObject({
      borderRadius: "var(--radius-lg)",
    });
  });
});

describe("snapshot de tema tokenizado", () => {
  it("mantém snapshot dos tokens aplicados no modo dark", () => {
    const theme = createAppTheme("dark");

    expect({
      mode: theme.palette.mode,
      primary: theme.palette.primary.main,
      error: theme.palette.error.main,
      success: theme.palette.success.main,
      backgroundDefault: theme.palette.background.default,
      backgroundPaper: theme.palette.background.paper,
      textPrimary: theme.palette.text.primary,
      textSecondary: theme.palette.text.secondary,
      fontFamilyIncludesBinanceNova: (theme.typography.fontFamily ?? "").includes("BinanceNova"),
      buttonRadius: (theme.components?.MuiButton?.styleOverrides?.root as { borderRadius?: string })
        .borderRadius,
    }).toMatchInlineSnapshot(`
      {
        "backgroundDefault": "var(--color-canvas-dark)",
        "backgroundPaper": "var(--color-surface-card-dark)",
        "buttonRadius": "var(--radius-md)",
        "error": "var(--color-trading-down)",
        "fontFamilyIncludesBinanceNova": true,
        "mode": "dark",
        "primary": "var(--color-primary)",
        "success": "var(--color-trading-up)",
        "textPrimary": "var(--color-on-dark)",
        "textSecondary": "var(--color-body)",
      }
    `);
  });
});
