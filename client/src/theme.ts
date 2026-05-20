export type AppColorMode = "light" | "dark";

// ThemeProvider foi removido na migração para DaisyUI.
// Esta função existe apenas para manter compatibilidade com o App.tsx durante a migração.
export function createAppTheme(_colorMode: AppColorMode): Record<string, never> {
  return {};
}
