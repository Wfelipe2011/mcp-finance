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
