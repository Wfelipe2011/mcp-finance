## Context

O `RunwayIndicator` recebe `runway_meses` (ou futuramente `runway_imediato_meses` / `runway_total_meses`) como número decimal de meses. A lógica de exibição é 100% frontend — sem mudança de API ou SQL.

A fórmula de conversão usa 30.44 dias/mês (média do ano gregoriano) para converter meses em dias totais:

```
dias_totais = ROUND(runway_meses * 30.44)
meses_inteiros = FLOOR(dias_totais / 30)
dias_restantes = dias_totais % 30
```

## Goals / Non-Goals

**Goals:**
- Exibir o fôlego em formato legível: "X dias" ou "X meses e X dias"
- Atualizar thresholds de cor para usar dias em vez de meses
- Mudança puramente no componente React

**Non-Goals:**
- Alterar fonte de dados, API ou SQL
- Mudar o componente para aceitar dias diretamente (a API continua retornando meses)

## Decisions

### D1: Converter meses → dias no frontend com 30.44 dias/mês

**Escolha:** `Math.round(meses * 30.44)` → decomposição em meses + dias.

**Alternativa considerada:** A API retornar dias diretamente.

**Rationale:** O SQL já usa meses como unidade natural (media de despesas por mês). Converter na API exigiria mudança no contrato. Fazer no frontend é suficiente e reversível.

---

### D2: Thresholds de cor em dias

| Cor | Critério |
|-----|----------|
| `success` (verde) | >= 90 dias (≈ 3 meses) |
| `warning` (amarelo) | >= 30 dias (≈ 1 mês) |
| `error` (vermelho) | < 30 dias |

**Rationale:** Mantém a mesma semântica do design atual (1 mês e 3 meses como limites), apenas expressado em dias para consistência com o formato de exibição.

---

### D3: Label "X dias" quando < 30 dias, "X meses e X dias" quando >= 30 dias

**Casos especiais:**
- `runway_meses === null` → "Fôlego indisponível"
- `dias_restantes === 0` → "X meses" (sem "e 0 dias")
- `meses_inteiros === 0` → "X dias" (não "0 meses e X dias")

## Risks / Trade-offs

- **30.44 dias/mês é aproximado** — pode produzir "1 mês e 0 dias" para exatamente 30 dias ou "29 dias" para muito próximo de 1 mês. Aceitável para fins de display.
- **Depende de runway-dual-metric ser implementado primeiro** — se `runway_meses` for substituído por `runway_imediato_meses`/`runway_total_meses`, a lógica de formatação precisa ser aplicada a cada campo. Esta mudança deve ser coordenada com `runway-dual-metric`.
