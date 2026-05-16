## Context

A tabela `transactions_enriched` tem as colunas `category` (texto em inglês, ex: `"Eating out"`) e `category_id` (código hierárquico do Pluggy, ex: `"11010000"`). Os 2 primeiros dígitos do `category_id` identificam o grupo pai — essa estrutura já está no dado e pode ser explorada diretamente.

O `merchant` está 100% vazio no dataset atual. "Estabelecimento" só pode ser derivado de `description` por parsing.

As categorias do Pluggy têm 74 valores distintos, todos em inglês, mapeáveis deterministicamente para PT-BR. A hierarquia de grupos é extraída pelos 2 primeiros dígitos do `category_id`.

O enriquecimento atual é um único `TRUNCATE + INSERT ... SELECT` dentro de uma transação. O override será um `UPDATE` adicional na **mesma transação**, executado após o INSERT.

## Goals / Non-Goals

**Goals:**
- Tabelas de lookup `category_groups` e `category_labels` no banco com traduções PT-BR estáticas
- Tabela `category_overrides` para recategorização manual por padrão ILIKE na `description`
- Colunas `category_pt`, `category_group`, `category_group_pt` em `transactions_enriched`
- Override aplicado como UPDATE na mesma transação do enriquecimento, após o INSERT
- `category_overrides` com campo `priority` (ASC = mais específico primeiro) e `match_count` para auditoria de regras órfãs

**Non-Goals:**
- ML ou categorização automática sem regras manuais
- Múltiplos níveis de hierarquia (apenas 1 nível de grupo pai)
- Extração de nome do estabelecimento de `description` (muito frágil, adiado)
- Criação de categorias customizadas com `category_id` próprio (só reusa IDs do Pluggy)
- Interface de administração das regras (só via SQL direto)

## Decisions

### D1: Tabelas de lookup vivem no banco (não em arquivo de config)

**Decisão:** `category_groups` e `category_labels` são tabelas PostgreSQL populadas via `INSERT` seed no `schema.sql`.

**Rationale:** Permite JOIN direto na query de enriquecimento sem lógica no adapter. Traduções podem ser atualizadas com `UPDATE` simples no banco. Seed é idempotente via `INSERT ... ON CONFLICT DO NOTHING`.

**Alternativa rejeitada:** Arquivo JSON/TS no código. Requereria carregar no adapter e resolver no aplicativo, adicionando complexidade sem benefício.

---

### D2: Override aplicado como UPDATE separado (não JOIN no INSERT)

**Decisão:** Após o `INSERT INTO transactions_enriched`, executa um `UPDATE transactions_enriched te SET category_id = co.category_id_override, category_pt = cl.name_pt, category_group = ..., category_group_pt = ... FROM category_overrides co JOIN category_labels cl ON ... WHERE te.description ILIKE co.pattern`.

**Rationale:** Separa responsabilidades — o INSERT principal não mistura dados de produção com config de override. O UPDATE é explícito e logável. Ambos ficam na mesma transação: se o UPDATE falhar, o INSERT é revertido.

**Alternativa rejeitada:** JOIN com `category_overrides` diretamente no INSERT usando `COALESCE`. Funciona, mas a query já é grande e o override ficaria invisível no log.

---

### D3: Pattern matching simples com ILIKE

**Decisão:** `description ILIKE co.pattern` sem transformação. Patterns usam `%AMAZON%`, `%AWS%` etc. Campo `priority` INTEGER: menor valor = mais específico = aplicado primeiro. O UPDATE usa `INNER JOIN category_overrides co ON te.description ILIKE co.pattern` com subquery de prioridade: o primeiro match (menor priority) vence.

**SQL do override:**
```sql
UPDATE transactions_enriched te
SET
  category_id     = co.category_id_override,
  category_pt     = cl.name_pt,
  category_group  = LEFT(co.category_id_override, 2),
  category_group_pt = cg.name_pt
FROM (
  SELECT DISTINCT ON (tx.id)
    tx.id AS tx_id,
    co.category_id_override,
    co.id AS override_id
  FROM transactions_enriched tx
  JOIN category_overrides co ON tx.description ILIKE co.pattern
  ORDER BY tx.id, co.priority ASC
) best
JOIN category_overrides co ON co.id = best.override_id
JOIN category_labels cl ON cl.category_id = co.category_id_override
JOIN category_groups cg ON cg.group_id = LEFT(co.category_id_override, 2)
WHERE te.id = best.tx_id;
```

**Rationale:** `DISTINCT ON (tx.id) ORDER BY priority ASC` garante que o match de menor priority vence. Simples, sem CTEs aninhadas complexas.

**Alternativa rejeitada:** Pattern com prioridade via `ROW_NUMBER()`. Equivalente mas mais verboso.

---

### D4: `match_count` como coluna de auditoria em `category_overrides`

**Decisão:** Após o UPDATE de override, executar um segundo UPDATE incrementando `match_count` em cada regra que fez match. Isso permite identificar regras nunca usadas.

**Rationale:** Overrides são frágeis — o Pluggy pode mudar o formato de `description` sem aviso. Com `match_count` você vê quais regras "morreram".

**Formato da tabela:**
```sql
CREATE TABLE category_overrides (
  id                  SERIAL PRIMARY KEY,
  pattern             TEXT NOT NULL,
  category_id_override TEXT NOT NULL REFERENCES category_labels(category_id),
  note                TEXT,
  priority            INTEGER NOT NULL DEFAULT 100,
  match_count         INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (NOW()::TEXT)
);
```

---

### D5: Colunas `category_pt`, `category_group`, `category_group_pt` são físicas em `transactions_enriched`

**Decisão:** As 3 colunas são gravadas fisicamente no INSERT (via JOIN nos lookups) e sobrescritas pelo UPDATE de override quando aplicável.

**Rationale:** O servidor MCP serve as ferramentas diretamente via SELECT em `transactions_enriched`. Colunas físicas eliminam JOIN em runtime para cada query analítica. Custo: re-sync necessário se traduções mudarem — aceitável dado que as traduções são estáticas.

**Alternativa rejeitada:** Colunas derivadas via VIEW com JOIN. Mais flexível para atualizar traduções, mas exige JOIN em toda query MCP. Para um banco com 3.295 linhas, a diferença é mínima, mas a consistência com o padrão bronze (colunas físicas) justifica a escolha.

## Risks / Trade-offs

- **[Risco] ILIKE `%pattern%` pode ter falsos positivos**: ex: `%AMAZON%` pode pegar "BANK OF AMAZON FALLS". Mitigação: patterns são inseridos manualmente — revisão humana antes de cada regra.
- **[Risco] Pluggy muda formato de `description`**: ex: `"AMAZON MARKETPLACE"` vira `"Amazon.com BR"`. `match_count = 0` após o próximo sync sinaliza o problema. Mitigação: monitorar `match_count` periodicamente via query.
- **[Trade-off] Seed de 74 categorias em `schema.sql`**: arquivo maior, mas é dado de config estático que não muda sem mudança intencional do Pluggy.
- **[Risco] `category_id_override` inválido (não existe em `category_labels`)**: FK garante integridade — INSERT na `category_overrides` falha se o ID não existe.
- **[Trade-off] Re-sync necessário para propagar mudanças de tradução**: consequência de colunas físicas. Aceitável — traduções são estáticas.

## Migration Plan

1. Atualizar `schema.sql`: 3 novas tabelas + seed de categorias + 3 novas colunas em `transactions_enriched`
2. Atualizar `BunPgAdapter.ts`: JOIN nos lookups no INSERT + UPDATE de overrides após INSERT
3. No banco: `DROP TABLE transactions_enriched` + aplicar novo DDL + criar `category_groups`, `category_labels`, `category_overrides`
4. Inserir seed das 74 categorias (idempotente via `ON CONFLICT DO NOTHING`)
5. Inserir regras iniciais de override (Amazon AWS → Digital services, OpenRouter → Digital services)
6. `bun run sync` para repopular com as novas colunas
7. Validar: `SELECT category_pt, category_group_pt, COUNT(*) FROM transactions_enriched GROUP BY 1,2 ORDER BY 3 DESC`
