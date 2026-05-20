import { describe, expect, it } from "bun:test";
import { applyAppTheme, createAppTheme, normalizeColorMode } from "./theme";

describe("contrato de tema DaisyUI", () => {
  it("modo escuro usa tema DaisyUI nomeado", () => {
    const theme = createAppTheme("dark");

    expect(theme.dataTheme).toBe("finance-dark");
    expect(theme.colorScheme).toBe("dark");
    expect(theme.rootClass).toBe("dark");
  });

  it("modo claro usa tema DaisyUI nomeado", () => {
    const theme = createAppTheme("light");

    expect(theme.dataTheme).toBe("finance-light");
    expect(theme.colorScheme).toBe("light");
    expect(theme.rootClass).toBe("light");
  });

  it("normaliza valores salvos desconhecidos para modo claro", () => {
    expect(normalizeColorMode("dark")).toBe("dark");
    expect(normalizeColorMode("light")).toBe("light");
    expect(normalizeColorMode("alto-contraste")).toBe("light");
    expect(normalizeColorMode(null)).toBe("light");
  });

  it("aplica classe, data-theme e color-scheme no elemento raiz", () => {
    const root = document.createElement("html");

    applyAppTheme("dark", root);

    expect(root.classList.contains("dark")).toBe(true);
    expect(root.classList.contains("light")).toBe(false);
    expect(root.dataset.theme).toBe("finance-dark");
    expect(root.style.colorScheme).toBe("dark");

    applyAppTheme("light", root);

    expect(root.classList.contains("light")).toBe(true);
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.dataset.theme).toBe("finance-light");
    expect(root.style.colorScheme).toBe("light");
  });

  it("tokens de primary e trading são os mesmos em ambos os modos", () => {
    const dark = createAppTheme("dark");
    const light = createAppTheme("light");

    expect(dark.tokens.primary).toBe("var(--color-primary)");
    expect(light.tokens.primary).toBe("var(--color-primary)");
    expect(dark.tokens.tradingUp).toBe("var(--color-trading-up)");
    expect(dark.tokens.tradingDown).toBe("var(--color-trading-down)");
    expect(light.tokens.tradingUp).toBe("var(--color-trading-up)");
    expect(light.tokens.tradingDown).toBe("var(--color-trading-down)");
  });

  it("canvas e textPrimary diferem entre modos", () => {
    const dark = createAppTheme("dark");
    const light = createAppTheme("light");

    expect(dark.tokens.canvas).not.toBe(light.tokens.canvas);
    expect(dark.tokens.textPrimary).not.toBe(light.tokens.textPrimary);
  });

  it("modo escuro usa variáveis de canvas e texto escuros", () => {
    const theme = createAppTheme("dark");

    expect(theme.tokens.canvas).toBe("var(--color-canvas-dark)");
    expect(theme.tokens.surfaceCard).toBe("var(--color-surface-card-dark)");
    expect(theme.tokens.textPrimary).toBe("var(--color-on-dark)");
    expect(theme.tokens.textBody).toBe("var(--color-body)");
    expect(theme.tokens.borderHairline).toBe("var(--color-hairline-on-dark)");
  });

  it("modo claro usa variáveis de canvas e texto claros", () => {
    const theme = createAppTheme("light");

    expect(theme.tokens.canvas).toBe("var(--color-canvas-light)");
    expect(theme.tokens.surfaceCard).toBe("var(--color-surface-soft-light)");
    expect(theme.tokens.textPrimary).toBe("var(--color-body-on-light)");
    expect(theme.tokens.textBody).toBe("var(--color-body-on-light)");
    expect(theme.tokens.borderHairline).toBe("var(--color-hairline-on-light)");
  });
});

describe("snapshot de tokens por modo", () => {
  it("snapshot do modo escuro", () => {
    const theme = createAppTheme("dark");

    expect({
      dataTheme: theme.dataTheme,
      colorScheme: theme.colorScheme,
      canvas: theme.tokens.canvas,
      surfaceCard: theme.tokens.surfaceCard,
      textPrimary: theme.tokens.textPrimary,
      textBody: theme.tokens.textBody,
      borderHairline: theme.tokens.borderHairline,
      primary: theme.tokens.primary,
      tradingUp: theme.tokens.tradingUp,
      tradingDown: theme.tokens.tradingDown,
    }).toMatchInlineSnapshot(`
      {
        "borderHairline": "var(--color-hairline-on-dark)",
        "canvas": "var(--color-canvas-dark)",
        "colorScheme": "dark",
        "dataTheme": "finance-dark",
        "primary": "var(--color-primary)",
        "surfaceCard": "var(--color-surface-card-dark)",
        "textBody": "var(--color-body)",
        "textPrimary": "var(--color-on-dark)",
        "tradingDown": "var(--color-trading-down)",
        "tradingUp": "var(--color-trading-up)",
      }
    `);
  });

  it("snapshot do modo claro", () => {
    const theme = createAppTheme("light");

    expect({
      dataTheme: theme.dataTheme,
      colorScheme: theme.colorScheme,
      canvas: theme.tokens.canvas,
      surfaceCard: theme.tokens.surfaceCard,
      textPrimary: theme.tokens.textPrimary,
      textBody: theme.tokens.textBody,
      borderHairline: theme.tokens.borderHairline,
      primary: theme.tokens.primary,
    }).toMatchInlineSnapshot(`
      {
        "borderHairline": "var(--color-hairline-on-light)",
        "canvas": "var(--color-canvas-light)",
        "colorScheme": "light",
        "dataTheme": "finance-light",
        "primary": "var(--color-primary)",
        "surfaceCard": "var(--color-surface-soft-light)",
        "textBody": "var(--color-body-on-light)",
        "textPrimary": "var(--color-body-on-light)",
      }
    `);
  });
});
