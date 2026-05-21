# Diagnóstico financeiro — João Wictor

**Data:** 20/05/2026  
**Tenant:** `d125f10a-7f21-485e-ac7b-357931dcdcc0` (João Wictor — joaowictor756@gmail.com)  
**Janela:** 12 meses fechados (mai/2025 – abr/2026) + runway e passivo de cartões (snapshot)

---

## 1. Resumo executivo

Nos últimos 12 meses fechados, a média mensal de **despesas (R$ 6.589)** ficou **abaixo** da **renda operacional média (R$ 9.241)**, com saldo médio **+R$ 2.652/mês**. Porém o perfil é **desigual**: salário na categoria “Salário” em apenas **8 de 12** meses, e **3 meses** fecharam no vermelho (mai, jun e out/2025).

A causa estrutural dominante não é lazer, e sim **dívidas e obrigações financeiras (~40% das saídas em 12m)** — fatura de cartão, empréstimos e juros (~**R$ 2.654/mês** em média).

O ponto crítico **atual** é **liquidez**: caixa **R$ 121,82** e runway de **~6 dias**. Mesmo com maio/2026 muito positivo no cubo (+R$ 13,3 mil no mês), o caixa imediato está praticamente zerado.

**Passivo de cartões sincronizados (3 contas):** **R$ 21.111,56**, com dois cartões estourados (Múltiplo e Pontos). Esse passivo **não** entrou nos KPIs de custo médio nem no runway — apenas pagamentos históricos de fatura no fluxo.

> **Cartão Itaú Samsung:** não aparece como conta `CREDIT` na sincronização Open Finance. Há só pagamentos históricos (jun/jul/2025). Ver seção 7 e o plano de ação para impacto no passivo total.

---

## 2. KPIs principais (12 meses fechados)

| Indicador | Valor |
|-----------|-------|
| Meses analisados | 12 |
| Custo médio mensal | **R$ 6.589,00** |
| Custo mediano mensal | **R$ 6.604,11** |
| Renda operacional média | **R$ 9.240,85** |
| Média empréstimos (cubo) | R$ 0,00 |
| Saldo médio mensal | **+R$ 2.651,84** |
| Meses no vermelho | **3** |
| Meses no vermelho (sem empréstimo no cubo) | **3** |
| Saldo médio (renda operacional − despesas) | **+R$ 2.651,84** |

### Salário (categoria “Salário”)

| Indicador | Valor |
|-----------|-------|
| Meses com salário | 8 |
| Total salários (12m) | R$ 51.007,00 |
| Média nos meses com salário | **R$ 6.375,88** |
| Média calendário (÷12) | **R$ 4.250,58** |
| Mediana salário | R$ 6.112,50 |

### Buckets de gasto (12m)

| Bucket | Total 12m | Média/mês | % do total |
|--------|-----------|-----------|------------|
| **Dívidas** | R$ 31.847,67 | R$ 2.653,97 | **40,06%** |
| Outros | R$ 23.713,15 | R$ 1.976,10 | 29,83% |
| Necessidades | R$ 12.548,81 | R$ 1.045,73 | 15,78% |
| Desejos | R$ 11.391,99 | R$ 949,33 | 14,33% |

### Runway (snapshot)

| Métrica | Valor |
|---------|-------|
| Saldo líquido imediato | **R$ 121,82** |
| Investimentos (runway total) | R$ 0,00 |
| Média saídas 90d | R$ 586,93 |
| Runway imediato | **0,2 meses (~6 dias)** |
| Runway total | **0,2 meses (~6 dias)** |

---

## 3. Meses sem salário (categoria “Salário”)

No recorte dos 12 meses fechados (mai/2025 – abr/2026):

| Mês | Salário registrado | Status |
|-----|-------------------|--------|
| Mai/2025 | R$ 0 | sem salário |
| Jun/2025 | R$ 0 | sem salário |
| Jul/2025 | R$ 0 | sem salário |
| Ago/2025 | R$ 0 | sem salário |
| Set/2025 – Abr/2026 | R$ 2.816 – R$ 10.365 | com salário |

**Observação:** “sem salário” = sem lançamento na categoria Salário; nesses meses ainda houve **receita operacional** no cubo (outras entradas).

A partir de **set/2025**, o padrão de salário estabiliza em torno de **R$ 6,1 mil/mês**.

---

## 4. Série mensal de fluxo (referência)

| Período | Destaque |
|---------|----------|
| Mai–Jun/2025 | Vermelho (sem salário no recorte) |
| Set–Dez/2025 | Recuperação; dez/2025 saldo +R$ 10.603 |
| Jan–Abr/2026 | Positivos |
| Mai/2026 (corrente) | Receita R$ 19.515 / Despesa R$ 6.189 / Saldo +R$ 13.326 |

---

## 5. Causa raiz

### 5.1 Desalavancagem (prioridade #1)

Dívidas > 20% das saídas (limiar da skill: **40%**). Principais linhas (12m):

| Linha | Total 12m | Média/mês |
|-------|-----------|-----------|
| Pagamento de fatura | R$ 16.123,12 | ~R$ 1.344 |
| Empréstimos/financiamentos | R$ 13.655,74 | ~R$ 1.138 |
| Juros/multas | R$ 2.068,81 | ~R$ 173 |

### 5.2 Renda irregular

Salário em 8/12 meses; picos de receita (set/2025, dez/2025, mai/2026) compensam meses fracos. Com salário calendário (**R$ 4.251**) vs necessidades + dívidas (**~R$ 3.700/mês**), a conta estrutural “fecha no papel”, mas meses sem salário são frágeis.

### 5.3 Empréstimos no cubo não mascaram déficit

`meses_no_vermelho` = `meses_no_vermelho_sem_emprestimo` (3). O crédito aparece nas **despesas** (fatura + financiamentos).

### 5.4 Desejos não são o vilão principal

Desejos ~**14%** (< 30%). Ajuste comportamental ajuda, mas não substitui ~**R$ 2,7 mil/mês** de dívidas.

### 5.5 Bucket “outros”

- Atividades empresariais (saída): **R$ 15.131** em 12m  
- Transferências PIX/boleto: **R$ 8.074**  
Revisar categorização e separar custo de negócio vs consumo.

### 5.6 Meses no vermelho (fechados)

| Mês | Saldo |
|-----|-------|
| Mai/2025 | -R$ 1.067,85 |
| Jun/2025 | -R$ 1.250,02 |
| Out/2025 | -R$ 195,11 |

---

## 6. Cartões sincronizados vs diagnóstico histórico

### O que o diagnóstico por fluxo incluiu

- **Pagamentos de fatura já lançados** (bucket dívidas, histórico 12m).  
- **Não incluiu** fatura aberta atual nem limite estourado.

### Snapshot de cartões (Open Finance)

| Cartão | Fatura aberta | Limite | Disponível | Vencimento | Status |
|--------|---------------|--------|------------|------------|--------|
| Itaú Múltiplo Mastercard | R$ 6.120,77 | R$ 700 | -R$ 5.420,77 | 10/05/2026 | Estourado |
| Itaú Pontos Mastercard | R$ 10.235,24 | R$ 6.055 | -R$ 4.180,24 | 11/05/2026 | Estourado |
| Azul Itaú Visa Platinum | R$ 4.755,55 | R$ 7.623 | R$ 2.867,45 | 11/05/2026 | Com margem |
| **Total (3 cartões)** | **R$ 21.111,56** | | | | |

**Liquidez real:** caixa ~R$ 122 **vs** ~R$ 21 mil de fatura em cartões (sendo ~R$ 16,4 mil em cartões estourados). Vencimentos 10–11/05 já passaram em relação à data do relatório — confirmar rotativo/juros no app Itaú.

---

## 7. Cartão Itaú Samsung (lacuna de dados)

- **Não** consta em `accounts` como `type = 'CREDIT'` (apenas Múltiplo, Pontos, Azul + conta corrente).  
- **Histórico na corrente:**
  - 12/06/2025 — FATURA PAGA Samsung Itau: R$ 988,79  
  - 11/07/2025 — FATURA PAGA Samsung Itau: R$ 2.521,00  
- **Sem pagamentos “Samsung” desde jul/2025** (só Azul na corrente).  
- **Itaú Múltiplo ≠ Samsung** no cadastro Pluggy.

**Implicação:** passivo e plano de quitação podem estar **subestimados** se o Samsung ainda tiver fatura aberta fora da sincronização.

---

## 8. Riscos imediatos

| Risco | Severidade |
|-------|------------|
| Runway < 30 dias (~6 dias) | **Urgência** |
| Dívidas > 40% das saídas | Alta |
| Salário em 8/12 meses | Média |
| Caixa R$ 121 após mês forte no cubo | Alta — destino do excedente (transferências) |
| Samsung não sincronizado | Alta — passivo possivelmente omitido |

---

## 9. Próximos passos sugeridos

1. Tratar liquidez e faturas estouradas (Múltiplo, Pontos) antes de consumo discricionário.  
2. Plano de desalavancagem: meta dívidas < 20% em 6–12 meses.  
3. Confirmar Samsung no Itaú e reautorizar Open Finance se o cartão ainda existir.  
4. Mapear entradas nos 4 meses sem “Salário” (mai–ago/2025).  
5. Reclassificar “Atividades empresariais” e transferências.  
6. Plano operacional de cortes: ver `plano-acao-joao-wictor-2026-05.md`.

---

## 10. Consultas de referência

```sql
SET app.tenant_id = 'd125f10a-7f21-485e-ac7b-357931dcdcc0';
-- KPIs: cube_cashflow_mensal, f_fluxo_caixa, kpi_runway_imediato
-- Cartões: accounts WHERE type = 'CREDIT', cube_patrimonio
```

**Skill:** `financial-diagnosis-analyzer`
