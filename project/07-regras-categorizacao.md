# Contexto 07 — Regras de Categorização

## Referência visual

O screenshot mostra um sistema de regras tipo "se → então":
- "beneficiário importado contém OXXO → definir categoria para Supermercado"
- "beneficiário importado contém CHURRASCARIA DO GAUCH → definir categoria para Restaurantes / Delivery"
- Ordenação importa: "as regras sempre são executadas na ordem em que você as vê"
- Botão "Criar nova regra"

---

## O que o usuário quer

> "Ao ver um lançamento, podemos redefinir sua categoria para outra. Com isso, criar uma regra que sempre que vier na descrição XYZ vai para categoria tal. Usuário pode decidir se vai servir apenas para aquele ou para os antigos também."

```
Fluxo:
  1. Usuário vê transação: "ARCO DOCES LTDA" → categoria: "Compras"
  2. Quer mudar para "Alimentação > Supermercado"
  3. Ao mudar, pop-up pergunta:
     "Criar regra? Sempre que 'ARCO DOCES' aparecer → Supermercado"
     [ Só esta vez ] [ Criar regra ] [ Criar regra + aplicar às antigas ]
  4. Se "aplicar às antigas": re-categoriza transações passadas com mesmo padrão
```

---

## Modelo de dados proposto

### Nova tabela: `categorization_rules`

```sql
CREATE TABLE categorization_rules (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,                   -- RLS
  priority        INT NOT NULL DEFAULT 0,          -- ordem de execução (menor = primeiro)
  
  -- Condição (match)
  field           TEXT NOT NULL,                   -- 'description', 'beneficiary_name', 'amount'
  operator        TEXT NOT NULL,                   -- 'contains', 'equals', 'starts_with', 'regex'
  value           TEXT NOT NULL,                   -- "OXXO", "CHURRASCARIA DO GAUCH"
  
  -- Ação
  category_pt          TEXT NOT NULL,              -- "Supermercado"
  category_group_pt    TEXT,                       -- "Alimentação" (derivado, pode ser preenchido)
  
  -- Metadados
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela de override manual: `transaction_category_overrides`

```sql
-- Sobrescritas manuais para uma transação específica (sem criar regra)
CREATE TABLE transaction_category_overrides (
  transaction_id  TEXT NOT NULL,                   -- FK para f_transacoes
  tenant_id       UUID NOT NULL,
  category_pt     TEXT NOT NULL,
  category_group_pt TEXT,
  overridden_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (transaction_id, tenant_id)
);
```

---

## Arquitetura: quem aplica as regras?

```
Opção A: regras aplicadas no enrich-worker (antes do LLM)
  
  Pluggy → bronze_transactions
      ↓
  [shared-worker: enrich]
      ↓ checa regras ANTES de chamar LLM
  categorization_rules → match?
      ├─ SIM → usa categoria da regra (não chama LLM)
      └─ NÃO → chama LLM para categorizar
      ↓
  ai_transaction_insights (categoria final)

Vantagem: economiza tokens LLM para transações já conhecidas
Desvantagem: regras precisam ser carregadas a cada job
```

```
Opção B: regras aplicadas em uma VIEW
  
  f_transacoes + categorization_rules + transaction_category_overrides
       ↓
  VIEW f_transacoes_categorizadas
    CASE
      WHEN override existe → usa override
      WHEN regra match → usa categoria da regra (primeira que bater)
      ELSE → usa ai_transaction_insights.category_pt
    END AS category_pt_final

Vantagem: sem re-processamento, regra aplicada retroativamente em tempo real
Desvantagem: VIEW fica complexa; ORDER BY priority precisa ser garantido
```

**Recomendação:** Opção B (VIEW) para exibição + opção A para economizar LLM em novos jobs.

---

## UX: onde as regras aparecem?

### Entry point 1: Na lista de transações
```
┌─────────────────────────────────────────────────────┐
│ CHURRASCARIA DO GAUCH           Alimentação  R$89,90 │
│ 15/mai · Nubank                 [✏️ Editar categoria]│
└─────────────────────────────────────────────────────┘

Ao clicar em [✏️]:
  ┌────────────────────────────────────┐
  │ Alterar categoria                  │
  │                                    │
  │ De: Alimentação → Para: [    ▼]   │
  │                                    │
  │ ☐ Criar regra para futuros        │
  │   "descrição contém CHURRASCARIA" │
  │                                    │
  │ ☐ Aplicar às transações passadas  │
  │   (3 transações encontradas)      │
  │                                    │
  │        [Cancelar] [Salvar]         │
  └────────────────────────────────────┘
```

### Entry point 2: Tela de Regras (gerenciamento)
```
┌─────────────────────────────────────────────────────────┐
│ Regras de Categorização                [+ Nova regra]   │
├────────┬──────────────────────────┬───────────────────── │
│ Ordem  │ Se descrição contém...   │ → Categoria          │
├────────┼──────────────────────────┼───────────────────── │
│ ≡  1   │ OXXO                     │ Supermercado   [✏️🗑] │
│ ≡  2   │ CHURRASCARIA             │ Restaurantes   [✏️🗑] │
│ ≡  3   │ iFood                    │ Delivery       [✏️🗑] │
│ ≡  4   │ Farma                    │ Farmácia       [✏️🗑] │
└────────┴──────────────────────────┴──────────────────── ┘
  ≡ = drag handle para reordenar prioridade
```

### Onde fica no menu?
```
Opção A: Sub-aba dentro de "Gastos"
  [ Histórico ] [ Orçamento ] [ Regras ]

Opção B: Dentro de Configurações/Settings
  ⚙️ Config → [Perfil] [Membros] [Regras] [Integrações]
  → Mais natural — regras são configuração, não visualização de dados
```

---

## Aplicar regra às transações antigas

Quando usuário seleciona "Aplicar às antigas":

```
Backend:
  1. Buscar todas as transações do tenant onde campo matches regra
  2. Para cada uma:
     - Inserir em transaction_category_overrides (ou atualizar ai_transaction_insights)
  3. Retornar contagem: "Regra aplicada a 12 transações"

Cuidado: Re-calcular cubes/views afetados? 
  → Se usarmos VIEW que já junta overrides, recalculo é automático!
  → cube_gastos_mensais precisa usar a VIEW, não direto f_transacoes
```

---

## Questões para o explore

1. **Campos de match**: apenas `description`? Ou também `beneficiary_name` (nome do estabelecimento via Pluggy)?

2. **Regex vs contains**: usuário técnico (Wilson) pode usar regex, mas para outros membros é complexo demais. Mostrar regex como opção avançada?

3. **Conflito de categorização**: se o LLM já categorizou como X e a regra diz Y, qual vence? Proposta: override manual > regra > LLM.

4. **Onde mostra as regras**: dentro de Configurações parece mais limpo. Mas o entry point natural é na transação.

5. **Re-enrich**: ao criar uma regra, re-processar também o `ai_transaction_insights` (para manter consistência) ou apenas criar o override na view?

---

## Dados já disponíveis

```
f_transacoes           ← description, beneficiary_name, amount, date
ai_transaction_insights ← category_pt atual (pode ser sobrescrito)
```

Precisa criar: `categorization_rules` + `transaction_category_overrides` + VIEW unificadora.

---

## Arquivos-chave para a change

### Backend
| Arquivo | Papel |
|---|---|
| `src/infrastructure/db/*.sql` | 2 novas tabelas + VIEW f_transacoes_categorizadas |
| `src/infrastructure/db/BunPgAdapter.ts` | CRUD de regras, aplicar regra a antigas |
| `src/application/web/routes/` | Novo arquivo `regras.ts` |
| `src/application/workers/shared-worker.ts` | Antes de chamar LLM: checar regras |
| `src/application/web/routes/transacoes.ts` | Endpoint para override manual |

### Frontend
| Arquivo | Papel |
|---|---|
| `client/src/tabs/Gastos.tsx` | Botão "editar categoria" em cada transação |
| `client/src/components/ConfigDialog.tsx` | Nova aba "Regras" |
| `client/src/api/types.ts` | Tipo `CategorizationRule` |

---

## Referências

- **DaisyUI Swap/Drag**: reordenação de regras por drag → usar biblioteca externa (dnd-kit) ou arrows simples (↑↓)
- **DaisyUI Modal**: https://daisyui.com/components/modal/ (popup de edição de categoria)
- **DaisyUI Select**: https://daisyui.com/components/select/ (escolha de categoria)
- **DaisyUI Toggle**: https://daisyui.com/components/toggle/ (ativar/desativar regra)
- **DaisyUI Table**: https://daisyui.com/components/table/ (listagem de regras)
