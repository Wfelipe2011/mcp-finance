import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindConfig from "../tailwind.config";

const cssPath = resolve(import.meta.dir, "index.css");
const css = readFileSync(cssPath, "utf8");

function extractBlock(selector: string): string {
  const escaped = selector.replace(".", "\\.");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) {
    throw new Error(`Bloco ${selector} não encontrado em index.css`);
  }

  return match[1];
}

describe("fundação de tokens CSS", () => {
  it("define --color-primary no :root", () => {
    const rootBlock = extractBlock(":root");
    expect(rootBlock).toContain("--color-primary: #fcd535;");
  });

  it("define tokens de trading no :root", () => {
    const rootBlock = extractBlock(":root");
    expect(rootBlock).toContain("--color-trading-up: #0ecb81;");
    expect(rootBlock).toContain("--color-trading-down: #f6465d;");
  });

  it("sobrescreve canvas e superfícies no modo .light", () => {
    const lightBlock = extractBlock(".light");
    expect(lightBlock).toContain("--color-canvas: #ffffff;");
    expect(lightBlock).toContain("--color-surface-card: #fafafa;");
    expect(lightBlock).toContain("--color-surface-elevated: #f5f5f5;");
  });

  it("mantém baseline de variáveis de cor via snapshot", () => {
    const rootBlock = extractBlock(":root");
    const colorTokens = rootBlock
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("--color-"));

    expect(colorTokens).toMatchInlineSnapshot(`
      [
        "--color-primary: #fcd535;",
        "--color-primary-active: #f0b90b;",
        "--color-primary-disabled: #3a3a1f;",
        "--color-ink: #181a20;",
        "--color-body: #eaecef;",
        "--color-body-on-light: #181a20;",
        "--color-muted: #707a8a;",
        "--color-muted-strong: #929aa5;",
        "--color-hairline-on-light: #eaecef;",
        "--color-hairline-on-dark: #2b3139;",
        "--color-border-strong: #cdd1d6;",
        "--color-canvas-light: #ffffff;",
        "--color-canvas-dark: #0b0e11;",
        "--color-surface-card-dark: #1e2329;",
        "--color-surface-elevated-dark: #2b3139;",
        "--color-surface-soft-light: #fafafa;",
        "--color-surface-strong-light: #f5f5f5;",
        "--color-on-primary: #181a20;",
        "--color-on-dark: #ffffff;",
        "--color-trading-up: #0ecb81;",
        "--color-trading-down: #f6465d;",
        "--color-accent-turquoise: #2dbdb6;",
        "--color-info: #3b82f6;",
        "--color-info-ring: #3b82f6;",
        "--color-canvas: var(--color-canvas-dark);",
        "--color-surface-card: var(--color-surface-card-dark);",
        "--color-surface-elevated: var(--color-surface-elevated-dark);",
        "--color-surface-soft: var(--color-surface-card-dark);",
        "--color-surface-strong: var(--color-surface-elevated-dark);",
        "--color-text-primary: var(--color-on-dark);",
        "--color-text-body: var(--color-body);",
        "--color-border-hairline: var(--color-hairline-on-dark);",
      ]
    `);
  });
});

describe("mapeamento de tokens no tailwind", () => {
  const extend = tailwindConfig.theme?.extend as {
    colors?: Record<string, string>;
    borderRadius?: Record<string, string>;
  };

  it("mapeia primary para var(--color-primary)", () => {
    expect(extend.colors?.primary).toBe("var(--color-primary)");
  });

  it("mapeia borderRadius.md para var(--radius-md)", () => {
    expect(extend.borderRadius?.md).toBe("var(--radius-md)");
  });
});

describe("configuração DaisyUI", () => {
  const daisyui = (tailwindConfig as Record<string, unknown>).daisyui as {
    themes?: unknown;
    logs?: boolean;
  };

  const themes = daisyui.themes as Array<Record<string, Record<string, string>>>;
  const financeLight = themes.find((theme) => "finance-light" in theme)?.["finance-light"];
  const financeDark = themes.find((theme) => "finance-dark" in theme)?.["finance-dark"];

  it("inclui o tema claro nomeado do produto", () => {
    expect(financeLight).toBeDefined();
    expect(financeLight?.["color-scheme"]).toBe("light");
  });

  it("inclui o tema escuro nomeado do produto", () => {
    expect(financeDark).toBeDefined();
    expect(financeDark?.["color-scheme"]).toBe("dark");
  });

  it("tem exatamente dois temas configurados", () => {
    expect(themes).toHaveLength(2);
  });

  it("mapeia os temas DaisyUI para a paleta do app", () => {
    expect(financeLight?.primary).toBe("#fcd535");
    expect(financeDark?.primary).toBe("#fcd535");
    expect(financeLight?.["base-100"]).toBe("#ffffff");
    expect(financeDark?.["base-100"]).toBe("#0b0e11");
    expect(financeLight?.["base-content"]).toBe("#181a20");
    expect(financeDark?.["base-content"]).toBe("#eaecef");
  });
});

describe("tokens semânticos modo escuro (:root)", () => {
  it("canvas semântico aponta para canvas-dark em :root", () => {
    const rootBlock = extractBlock(":root");
    expect(rootBlock).toContain("--color-canvas: var(--color-canvas-dark);");
  });

  it("text-primary aponta para on-dark em :root", () => {
    const rootBlock = extractBlock(":root");
    expect(rootBlock).toContain("--color-text-primary: var(--color-on-dark);");
  });

  it("border-hairline aponta para hairline-on-dark em :root", () => {
    const rootBlock = extractBlock(":root");
    expect(rootBlock).toContain("--color-border-hairline: var(--color-hairline-on-dark);");
  });
});

describe("tokens semânticos modo claro (.light)", () => {
  it("canvas semântico aponta para branco em .light", () => {
    const lightBlock = extractBlock(".light");
    expect(lightBlock).toContain("--color-canvas: #ffffff;");
  });

  it("text-primary aponta para cor escura em .light", () => {
    const lightBlock = extractBlock(".light");
    expect(lightBlock).toContain("--color-text-primary: #181a20;");
  });

  it("border-hairline aponta para hairline-on-light em .light", () => {
    const lightBlock = extractBlock(".light");
    expect(lightBlock).toContain("--color-border-hairline: #eaecef;");
  });
});
