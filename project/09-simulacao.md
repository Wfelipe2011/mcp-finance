# Contexto 09 — Simulação Financeira

## O que o usuário quer

> "Uma página dedicada a cruzar as informações do usuário. O usuário planeja comprar algo e visualiza como ficam os meses futuros, se cabe a parcela no bolso. Não é apenas cartões — usa média de X meses (usuário escolhe o horizonte). Pode remover itens de categorias que não fazem sentido. Simula gastos regulares como parcelas, gastos recorrentes, média de alimentação, transporte, moradia, saúde. Persistir simulações fechadas. LLM gera mensagem curta como agente especialista a cada simulação."

---

## Exemplo concreto

```
Usuário quer comprar iPhone 21x = R$400/mês

Mês passado teve gasto com carro (mecânica R$1.800) que não é recorrente.
Ele remove da simulação.

Simulação usa:
  + Média de Alimentação (últimos 6 meses): R$1.400
  + Média de Transporte (últimos 6 meses):  R$400  ← sem o conserto do carro
  + Moradia (fixo):                         R$2.500
  + Saúde (média):                          R$300
  + Parcelas existentes (iPhone, etc.):     R$900
  + Nova parcela (iPhone):                  R$400  ← novo item
  ─────────────────────────────────────────────────
  Total despesas projetadas:                R$5.900

  Média de receita (6 meses):               R$8.000
  ─────────────────────────────────────────────────
  Sobra projetada:                          R$2.100 ✅ cabe!
```

---

## Modelo de dados proposto

### `simulations` — cabeçalho da simulação

```sql
CREATE TABLE simulations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  name            TEXT NOT NULL,                    -- "iPhone 15 Pro"
  status          TEXT NOT NULL DEFAULT 'open',     -- open | closed
  horizon_months  INT NOT NULL DEFAULT 6,           -- janela histórica usada
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  -- Mensagem LLM gerada
  llm_message     TEXT,
  llm_model       TEXT,
  llm_generated_at TIMESTAMPTZ
);
```

### `simulation_items` — itens da simulação

```sql
CREATE TABLE simulation_items (
  id              SERIAL PRIMARY KEY,
  simulation_id   UUID REFERENCES simulations(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  
  -- Tipo de item
  item_type       TEXT NOT NULL,  -- 'new_purchase' | 'recurring' | 'avg_category' | 'fixed' | 'excluded'
  
  label           TEXT NOT NULL,             -- "iPhone 15 Pro", "Alimentação (média)"
  category_pt     TEXT,                      -- categoria associada (para exclusões)
  
  -- Para compra parcelada nova
  total_amount    NUMERIC(12,2),             -- valor total
  installments    INT,                       -- nº de parcelas
  monthly_amount  NUMERIC(12,2) NOT NULL,    -- valor mensal
  
  -- Para exclusões de histórico
  is_exclusion    BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = excluir da média
  excluded_transaction_ids TEXT[],                 -- IDs de transações excluídas
  
  -- Sinal: positivo = receita, negativo = despesa
  direction       TEXT NOT NULL DEFAULT 'expense'  -- 'expense' | 'income'
);
```

### `simulation_months` — resultado projetado por mês (materializado)

```sql
CREATE TABLE simulation_months (
  simulation_id   UUID REFERENCES simulations(id) ON DELETE CASCADE,
  month_offset    INT NOT NULL,        -- 0 = mês atual, 1 = próximo, ...
  year            INT NOT NULL,
  month           INT NOT NULL,
  total_income    NUMERIC(12,2),
  total_expenses  NUMERIC(12,2),
  balance         NUMERIC(12,2),
  PRIMARY KEY (simulation_id, month_offset)
);
```

---

## Arquitetura de cálculo

```
Inputs do usuário:
  - Horizonte histórico: N meses passados
  - Itens adicionais: nova compra parcelada
  - Exclusões: transações ou categorias inteiras

Processo de cálculo (backend ou frontend?):

Opção A: Cálculo no backend
  POST /api/simulations/calculate
  Body: { horizon_months, items, exclusions }
  Response: { months: [{ year, month, income, expenses, balance }] }
  → Backend usa SQL para buscar médias, aplica os ajustes e retorna

Opção B: Cálculo no frontend com dados pré-carregados
  Frontend já tem: médias por categoria, compromissos ativos, receita média
  Calcula projeção localmente (mais rápido, menos round-trips)
  → Risco: inconsistência se dados mudam

Recomendação: Opção A (backend) — as médias precisam de SQL para 
ser calculadas corretamente com as exclusões aplicadas.
```

---

## UX da tela de Simulação

### Passo 1: Nova simulação

```
┌──────────────────────────────────────────────────┐
│ Nova Simulação                                   │
│                                                  │
│ Nome: [iPhone 15 Pro              ]              │
│                                                  │
│ Usar histórico de: [6 ▼] meses passados          │
│                                                  │
│ O que você quer simular?                         │
│   ○ Compra parcelada nova                        │
│   ○ Despesa recorrente nova                      │
│   ○ Mudança de receita                           │
│                                                  │
│ Compra parcelada:                                │
│   Valor total: [R$ 8.400    ]                    │
│   Parcelas:    [21 ▼]                            │
│   → R$ 400/mês por 21 meses                      │
│                                              [→] │
└──────────────────────────────────────────────────┘
```

### Passo 2: Revisar base histórica

```
┌──────────────────────────────────────────────────┐
│ Base histórica (últimos 6 meses)        [Editar] │
├─────────────────────┬────────────────────────────┤
│ Receita média       │             R$8.000 ✅      │
├─────────────────────┼────────────────────────────┤
│ Alimentação         │             R$1.400         │
│ Transporte          │   ~~R$1.800~~ R$400 ⚠️      │
│   └ conserto carro  │   -R$1.400 [excluir ✅]     │
│ Moradia             │             R$2.500         │
│ Saúde               │               R$300         │
│ Parcelas existentes │               R$900         │
├─────────────────────┼────────────────────────────┤
│ NOVO: iPhone 15 Pro │               R$400 🆕      │
├─────────────────────┼────────────────────────────┤
│ Total despesas proj.│             R$5.900         │
│ Receita proj.       │             R$8.000         │
│ Sobra proj.         │             R$2.100 ✅      │
└─────────────────────┴────────────────────────────┘
```

### Passo 3: Projeção mês a mês + LLM

```
┌──────────────────────────────────────────────────────┐
│ 💬 "Com base nos seus padrões, o iPhone cabe no      │
│    orçamento. Mas atenção: nos meses de jan/fev,     │
│    historicamente seus gastos sobem 15% (festas).    │
│    Mantenha uma reserva de R$300 nesses meses."      │
│                                            [Agente] │
├──────┬───────────┬──────────────┬────────────────────┤
│ Mês  │  Receita  │   Despesas   │ Saldo              │
├──────┼───────────┼──────────────┼────────────────────┤
│ Jun  │  R$8.000  │   R$5.900    │ R$2.100 ✅         │
│ Jul  │  R$8.000  │   R$5.900    │ R$2.100 ✅         │
│ Ago  │  R$8.000  │   R$5.700    │ R$2.300 ✅ (-parc) │
│ ...  │    ...    │     ...      │   ...              │
│ Fev  │  R$8.000  │   R$6.200    │ R$1.800 ⚠️         │
└──────┴───────────┴──────────────┴────────────────────┘

[Salvar simulação] [Refazer]
```

---

## Simulações persistidas

```
┌────────────────────────────────────────────────────────┐
│ Minhas Simulações                                      │
├────────────────┬──────────┬────────────────────────────┤
│ Nome           │ Data     │ Resultado                  │
├────────────────┼──────────┼────────────────────────────┤
│ iPhone 15 Pro  │ mai/26   │ ✅ Viável (sobra R$2.100)  │
│ Reforma Cozinha│ abr/26   │ ⚠️ Apertado (sobra R$200) │
│ PS5 Parcelado  │ mar/26   │ 🔴 Inviável (-R$300/mês)  │
└────────────────┴──────────┴────────────────────────────┘
                                     [+ Nova simulação]
```

Ao clicar em uma simulação:
- Ver parâmetros usados
- Ver a projeção original
- **[Reabrir e refazer]** — recarrega os parâmetros, recalcula com dados atuais
- Ver mensagem do LLM da época

---

## LLM Agent de simulação

```
Prompt especializado:
  Role: "Você é um consultor financeiro pessoal especializado em planejamento."
  
  Input:
    - Simulação: nome, valor, parcelas
    - Resultado: viável / inviável / apertado
    - Meses críticos: onde o saldo fica baixo
    - Contexto do usuário: categorias com maior gasto histórico
  
  Output: mensagem curta (2-3 frases), direta, sem jargão técnico.
  
  Tom: honesto mas encorajador.
    Exemplos:
    ✅ "O iPhone cabe no orçamento com uma folga confortável. Fique atento ao mês de fevereiro, onde seus gastos costumam ser maiores."
    ⚠️ "Dá pra fazer, mas vai apertar. Considere adiar 2 meses para acumular uma reserva antes de começar as parcelas."
    🔴 "Com esse valor, o mês de agosto fica no negativo. Que tal pensar em 30x em vez de 21x, reduzindo para R$280/mês?"
```

---

## Questões para o explore

1. **Cálculo de exclusões**: quando o usuário exclui "conserto do carro (R$1.400)", isso remove da média de Transporte ou de toda a base? Precisa ser por transação específica ou por categoria inteira?

2. **Receita**: usa sempre a média histórica ou o usuário pode ajustar ("minha receita vai aumentar R$500 a partir de julho")?

3. **Parcelas existentes**: incluir automaticamente os compromissos da `cube_compromissos_ativos` ou deixar o usuário escolher o que entra?

4. **Horizon de projeção**: mostrar quantos meses à frente? O número de parcelas da compra nova? Ou fixo (12 meses)?

5. **Salvar simulação**: salva os parâmetros ou os resultados calculados? Se refizer a simulação 3 meses depois, usa dados históricos novos ou os mesmos?

6. **LLM**: endpoint dedicado ou integrar ao `forecast-jobs`? A mensagem é gerada sincronamente ao salvar ou em background (worker)?

---

## Dados já disponíveis

```
cube_gastos_mensais    ← médias históricas por categoria
cube_compromissos_ativos ← parcelas existentes
cube_cashflow_mensal   ← receita histórica real
cube_cashflow_projetado ← já tem projeção de receitas/despesas
f_transacoes           ← transações individuais para exclusões
```

---

## Arquivos-chave para a change

### Backend
| Arquivo | Papel |
|---|---|
| `src/infrastructure/db/*.sql` | 3 novas tabelas: simulations, simulation_items, simulation_months |
| `src/infrastructure/db/BunPgAdapter.ts` | CRUD de simulações + `calculateSimulation()` |
| `src/application/web/routes/` | Novo `simulacoes.ts`: POST /calculate, POST /save, GET /, GET /:id |
| `src/infrastructure/ai/` | Novo `simulationAgent.ts` — prompt de consultor financeiro |

### Frontend
| Arquivo | Papel |
|---|---|
| `client/src/tabs/` | Novo `Simulacao.tsx` — tela principal |
| `client/src/components/` | `SimulacaoForm.tsx`, `SimulacaoResultado.tsx`, `SimulacaoHistorico.tsx` |
| `client/src/api/types.ts` | Tipos `Simulation`, `SimulationItem`, `SimulationMonth` |
| `client/src/api/client.ts` | `createSimulation()`, `getSimulations()`, etc. |

---

## Referências

- **DaisyUI Steps**: https://daisyui.com/components/steps/ (wizard de nova simulação)
- **DaisyUI Modal**: https://daisyui.com/components/modal/ (seleção de transações para excluir)
- **DaisyUI Badge**: https://daisyui.com/components/badge/ (✅ viável / ⚠️ apertado / 🔴 inviável)
- **DaisyUI Stat**: https://daisyui.com/components/stat/ (resumo da simulação)
- **DaisyUI Table**: https://daisyui.com/components/table/ (projeção mês a mês)
- **DaisyUI Chat bubble**: https://daisyui.com/components/chat/ (mensagem do LLM como "consultor")
- **Recharts AreaChart**: já no projeto — bom para visualizar saldo ao longo dos meses da simulação

---

## Posição no menu

```
A Simulação é uma feature de alto valor mas de uso esporádico
(não diário como Resumo/Gastos).

Opção A: Dentro de "Próx. Mês" como sub-aba
  [ Próximo Mês ] [ Simulação ]
  → Faz sentido — planejamento futuro

Opção B: Botão flutuante/FAB na tela Próx. Mês
  → DaisyUI FAB: https://daisyui.com/components/fab/
  → Menos espaço, não polui o menu

Opção C: Dentro de "IA" como sub-aba (tem LLM)
  [ Insights ] [ Previsões ] [ Simulação ]
  → Faz sentido pelo agente LLM, mas UX é confusa
  → Simulação é do usuário, não da IA
```
