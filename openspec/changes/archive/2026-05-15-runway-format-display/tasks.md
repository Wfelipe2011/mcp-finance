## 1. Lógica de formatação

- [x] 1.1 Em `RunwayIndicator.tsx`, criar função `formatRunway(meses: number | null): string` que converte meses em dias (`Math.round(meses * 30.44)`) e retorna:
  - `null` → `"Fôlego indisponível"`
  - `< 30 dias` → `"X dias"`
  - `>= 30 dias, dias_restantes > 0` → `"X meses e X dias"`
  - `>= 30 dias, dias_restantes === 0` → `"X meses"`
- [x] 1.2 Atualizar função `runwayColor()` para usar dias totais como threshold: `>= 90` → success, `>= 30` → warning, `< 30` → error, `null` → default

## 2. Componente RunwayIndicator

- [x] 2.1 Substituir `runway.runway_meses.toFixed(1) + " meses de fôlego"` pelo retorno de `formatRunway(runway.runway_meses)` no label do Chip
- [x] 2.2 Substituir `runwayColor(runway.runway_meses)` para passar dias calculados (ou recalcular internamente na função atualizada)

## 3. Verificação

- [x] 3.1 Testar manualmente no browser com `runway_meses = 0.8` → espera "24 dias" (chip error)
- [x] 3.2 Testar com `runway_meses = 2.43` → espera "2 meses e 14 dias" (chip warning)
- [x] 3.3 Testar com `runway_meses = null` → espera "Fôlego indisponível" (chip default)
- [x] 3.4 Testar com `runway_meses = 4.0` → espera "4 meses" ou "4 meses e X dias" (chip success)
