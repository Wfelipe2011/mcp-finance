# Contexto 06 — Orçamento: Meta vs Realidade por Categoria

## Referência visual

O screenshot enviado mostra o padrão de mercado (app similar):
- Sidebar com Orçamento / Relatórios / Agendamentos
- Cards mensais com Receita orçada vs real, Gastos orçados vs reais
- Tabela de categorias: Orçado | Gasto | Saldo — verde se dentro, vermelho se estourou
- Comparação lado a lado de meses diferentes

---

## O que o usuário quer

> "Uma tela onde o usuário pode colocar quando ele acha que vai gastar, e conforme o mês for lançando, vamos vendo a realidade."

```
Fluxo mental do usuário:
  Início do mês → "Acho que vou gastar R$ 1.500 em Alimentação"
  Dia 10        → "Já gastei R$ 800... estou no ritmo certo?"
  Fim do mês    → "Gastei R$ 1.800 — estourei R$ 300 em Alimentação"
```

---

## Modelo de dados proposto

### Nova tabela: `budget_categories`

```sql
CREATE TABLE budget_categories (
  id            SERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL,                    -- RLS
  year          INT NOT NULL,
  month         INT NOT NULL,                     -- 1-12
  category_pt   TEXT NOT NULL,                    -- igual ao enrich
  amount_target NUMERIC(12,2) NOT NULL DEFAULT 0, -- valor orçado pelo usuário
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, year, month, category_pt)
);
```

### View: `cube_budget_vs_real`

```sql
-- Cruza budget_categories com cube_gastos_mensais
SELECT
  b.year, b.month,
  b.category_pt,
  b.amount_target                        AS orcado,
  COALESCE(g.total_gasto, 0)             AS gasto,
  b.amount_target - COALESCE(g.total_gasto, 0) AS saldo,
  CASE WHEN COALESCE(g.total_gasto, 0) > b.amount_target
       THEN 'estourado' ELSE 'ok' END    AS status
FROM budget_categories b
LEFT JOIN cube_gastos_mensais g
  ON g.tenant_id = b.tenant_id
 AND g.year = b.year
 AND g.month = b.month
 AND g.category_pt = b.category_pt
```

---

## UX proposta

### Tela Orçamento (nova aba no menu? ou dentro de Gastos?)

```
Opção A: item próprio no Dock
  [Resumo] [Gastos] [Próx.] [Invest.] [IA]  ← sem espaço para mais
  → Orçamento entraria como 6º item ou substituiria algum?

Opção B: dentro de "Gastos" como sub-aba
  [ Histórico ] [ Orçamento ]
  → Mais natural — Gastos já responde "onde foi o dinheiro",
    Orçamento responde "quanto planejei"

Opção C: dentro de "Próx. Mês"
  Faz sentido — orçamento é planejamento futuro
```

### Layout da tela

```
┌─────────────────────────────────────────────────┐
│  maio 2026                              [Editar] │
├─────────────────┬───────────┬────────────────────┤
│   Categoria     │  Orçado   │  Gasto   │  Saldo  │
├─────────────────┼───────────┼──────────┼─────────┤
│ Alimentação     │ R$1.500   │ R$1.200  │ R$300 ✅│
│   Restaurantes  │   R$600   │   R$450  │ R$150 ✅│
│   Supermercado  │   R$900   │   R$750  │ R$150 ✅│
├─────────────────┼───────────┼──────────┼─────────┤
│ Moradia         │ R$2.500   │ R$2.800  │ -R$300 🔴│
├─────────────────┼───────────┼──────────┼─────────┤
│ Transporte      │   R$500   │   R$320  │ R$180 ✅│
│ Saúde           │   R$300   │     R$0  │ R$300 ✅│
├─────────────────┼───────────┼──────────┼─────────┤
│ SEM ORÇAMENTO   │           │ R$450    │         │
│ Compras Online  │     —     │   R$450  │   —     │
└─────────────────┴───────────┴──────────┴─────────┘

Card resumo no topo:
┌───────────────┬───────────────┬───────────────┐
│ Total Orçado  │ Total Gasto   │ Saldo Geral   │
│  R$5.000      │  R$4.770      │    R$230 ✅   │
└───────────────┴───────────────┴───────────────┘
```

### Modo edição

```
Usuário clica em [Editar]:
- Cada linha de categoria vira input editável
- Pode copiar orçamento do mês anterior [Copiar de abril]
- Pode usar média histórica como sugestão [Usar média 3 meses]
- [Salvar]
```

---

## Questões para o explore

1. **Granularidade**: orçar por `category_pt` (Restaurantes, Supermercado) ou por `category_group_pt` (Alimentação)? Ou ambos com hierarquia?

2. **Categorias sem orçamento**: mostrar separado (como no screenshot "SEM ORÇAMENTO") ou esconder?

3. **Meses anteriores**: o orçamento de um mês passado é read-only ou editável?

4. **Propagar orçamento**: "mesmo orçamento para todos os meses do ano" — usuário quer isso?

5. **Alertas**: quando atingir 80% do orçamento de uma categoria, notificar? (depende do contexto 05 item D — notificações)

6. **Onde fica no menu**: sub-aba dentro de "Gastos" parece mais natural. Confirmar?

---

## Dados já disponíveis

```
cube_gastos_mensais    ← real por categoria/mês — JÁ EXISTE
cube_gastos_mensais    ← total_gasto, category_pt, category_group_pt
f_transacoes           ← transações individuais
```

Só falta: `budget_categories` (meta do usuário) + view de cruzamento.

---

## Arquivos-chave para a change

### Backend
| Arquivo | Papel |
|---|---|
| `src/infrastructure/db/*.sql` | Criar tabela `budget_categories` + view `cube_budget_vs_real` |
| `src/infrastructure/db/BunPgAdapter.ts` | Métodos: `getBudget(year, month)`, `upsertBudgetCategory()`, `getBudgetVsReal()` |
| `src/application/web/routes/` | Novo arquivo `orcamento.ts`: GET + PUT por mês |
| `src/application/web/router.ts` | Registrar rotas `/api/budget/:year/:month` |

### Frontend
| Arquivo | Papel |
|---|---|
| `client/src/tabs/Gastos.tsx` | Adicionar sub-aba "Orçamento" **ou** criar `Orcamento.tsx` separado |
| `client/src/api/types.ts` | Tipos `BudgetCategory`, `BudgetVsReal` |
| `client/src/api/client.ts` | `fetchBudget()`, `updateBudget()` |

---

## Referências

- **DaisyUI Table**: https://daisyui.com/components/table/
- **DaisyUI Progress**: https://daisyui.com/components/progress/ (barra de orçamento)
- **DaisyUI Input**: https://daisyui.com/components/input/ (edição inline)
- **DaisyUI Badge**: https://daisyui.com/components/badge/ (status ok/estourado)
- **Inspiração**: YNAB (screenshot), Minhas Economias, Organizze
