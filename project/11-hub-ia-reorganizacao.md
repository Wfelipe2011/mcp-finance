# Contexto 11 — Hub de IA + Reorganização das telas (UX Audit)

## Objetivo desta rodada de explore

Implementar as recomendações do **UX Audit** (`docs/Relatório de UX Audit_ Aplicação Finanças Familiar.md`) que **não estão cobertas** pelos contextos 01–09:

1. Eliminar redundância "Insights" (aba) vs "IA → Insights" (sub-aba)
2. Reorganizar a tela "IA" — separar **conteúdo para o usuário** de **operação do modelo** (e este último morre com o contexto 04)
3. Promover insights e ações do LLM ao **topo do Resumo**, não escondidos numa aba
4. Definir o papel do **chat (contexto 10)** dentro dessa nova hierarquia: balão flutuante OU hub central?

---

## Diagnóstico atual (UX Audit)

```
Hoje                                    Problema apontado
─────────────────────────────────────   ─────────────────────────────────
Tela "Insights"                         Insights são o diferencial mas
  └ Análise do Mês                      ficam soltos numa aba lateral.
  └ Anomalias detectadas

Tela "IA"                               Mesma "Análise do Mês" repetida
  └ sub-aba Insights ← DUPLICADO        em dois lugares.
  └ sub-aba Previsões
  └ sub-aba Treinar ← morre no ctx 04   Mistura conteúdo do usuário com
                                        operação interna do modelo.

Tela "Resumo (Home)"                    Mensagem de IA aparece como
  └ Card "Mensagem de IA"               status ("disponível") ao invés
     mostra status, não conteúdo        do conteúdo do insight em si.

Tela "Próx. Mês"                        Bom, mas projeção numérica seca.
  └ Projeção, compromissos              Falta a leitura/recomendação
                                        ("o que fazer com isso?").
```

---

## Proposta a explorar

### Opção A — Promover insight ao Resumo, manter aba IA enxuta

```
┌─────────────────────────────────────────┐
│ Resumo (Home)                           │
├─────────────────────────────────────────┤
│ ┌─ Card destaque: Insight do dia ─────┐│
│ │ 🧠 "Você gastou 23% mais em        ││
│ │     alimentação. Considere..."     ││
│ │ [Ver detalhes] [Conversar 💬]      ││
│ └────────────────────────────────────┘│
│ ┌──────┬──────┬──────┬───────────────┐│
│ │Result│Receit│Despes│Patrimônio    ││
│ └──────┴──────┴──────┴───────────────┘│
│ ┌─ Próximos compromissos chave ─────┐ │
│ └───────────────────────────────────┘ │
└─────────────────────────────────────────┘

Aba "IA" vira "Insights" — hub único:
  [ Análise do Mês ] [ Anomalias ] [ Previsões ]
  (Treinar removido pelo contexto 04)

Antiga "Tela Insights" some — consolidada na IA renomeada.
```

### Opção B — Chat como hub central (radical, alinhada à UX Audit)

```
┌─────────────────────────────────────────┐
│ Resumo (números frios)                  │
│ Gastos (drill-down)                     │
│ Próx. Mês (compromissos + projeção)    │
│ Investimentos                           │
│ 💬 Conversar / Insights (ex-"IA")      │
└─────────────────────────────────────────┘

A última aba do Dock vira o **chat em tela cheia**:
- Welcome com cards de insight do mês prontos
- Anomalias do mês como mensagens iniciais do "assistente"
- Usuário continua a conversa de onde os insights pararam
- O balão flutuante some — chat é a aba

Vantagem: insight + ação acionável + conversa estão no mesmo lugar.
Risco: usuário pode achar "chat" e não procurar insights ali.
```

### Opção C — Híbrido: aba "Insights" + balão flutuante

```
- Aba "Insights" (ex-"IA") — leitura passiva: cards do mês, anomalias,
  previsões, "o que mudou"
- Balão flutuante de chat (contexto 10) — pergunta livre em qualquer tela
- Card de destaque no Resumo apenas com 1 insight do dia
```

---

## Renomeações sugeridas

| Antes | Depois | Por quê |
|---|---|---|
| Aba "Insights" | (removida, consolidada em IA) | Duplicidade com sub-aba IA |
| Aba "IA" | "Insights" (Opção A) ou "Conversar" (Opção B) | "IA" é jargão técnico, não fala com o usuário |
| Sub-aba "Treinar" | (removida no contexto 04) | ML removido |
| Sub-aba "Previsões" | Mantida ou virar card dentro de Insights | Decidir junto com 04 |

---

## Conexões com outros contextos

```
01 (DaisyUI nav)  ──── decide como o Dock fica (5 itens) e qual o nome
                       da última aba (IA / Insights / Conversar)

04 (Forecast sem ML) ── remove sub-aba "Treinar"; previsões viram só
                        leitura do SQL view

10 (Chat finalização) ─ decide se chat é balão (Opção A/C) ou aba inteira
                        (Opção B). Os welcome chips desse contexto saem
                        dos insights gerados aqui.

05 #11 (Compartilhar  ─ se Opção B, "compartilhar insight" vira ação
       insights)        natural dentro do chat.
```

---

## Modelo de dados / endpoints já disponíveis

```
ai_monthly_digest          ← análise do mês (já existe)
ai_transaction_insights    ← anomalias e enrichment (já existe)
forecast_predictions       ← previsões (existe; SQL no ctx 04)
daily_insight_messages     ← insight diário (já existe, change daily-ml-insights)

Falta:
  - endpoint /api/insights/today que retorne UM card "destaque" para o Resumo
    (regra: anomalia mais grave > insight diário > digest do mês)
```

---

## Questões para o explore

1. **Opção A, B ou C?** O usuário-tipo (Wilson/João) abre o app querendo "ver o número" ou "ouvir o insight"?
2. **Aba renomeada como?** "IA" / "Insights" / "Conversar" / "Coach"?
3. **Insight no topo do Resumo** ocupa quanto espaço? Pode ser dismissível?
4. **Anomalias como mensagens do chat (Opção B)** — quando o LLM "inicia conversa"? Toda abertura do app ou só novidades?
5. **Compartilhar insight** (5 #11 do UX Audit — "Spotify Wrapped do dinheiro") faz sentido neste contexto ou fica para depois?
6. **Tela Configurações** — onde mora? Drawer no desktop, modal no mobile? (relaciona ctx 01)

---

## Arquivos-chave

| Arquivo | Papel |
|---|---|
| `client/src/App.tsx` | Definição de abas — renomeação |
| `client/src/tabs/IaScreen.tsx` | Hoje tem 3 sub-abas — vira hub único |
| `client/src/tabs/InsightsScreen.tsx` | (se existir) — consolidar dentro de IA |
| `client/src/tabs/ResumoScreen.tsx` | Adicionar card de insight no topo |
| `src/application/web/routes/` | Possível novo `/api/insights/today` |
| `client/src/components/ChatWidget.tsx` | Se Opção B, vira tela cheia |

---

## Referências

- **UX Audit completo**: `docs/Relatório de UX Audit_ Aplicação Finanças Familiar.md`
  - Seção 3: "Sinal vs Ruído" (redundâncias)
  - Seção 4.1: "Reorganização da Hierarquia da Informação"
- **DaisyUI Hero**: https://daisyui.com/components/hero/ (card de insight no topo)
- **DaisyUI Card**: https://daisyui.com/components/card/
- **DaisyUI Alert** (anomalia destacada): https://daisyui.com/components/alert/

---

## Sugestão de ordem

```
1. Decidir Opção A/B/C (este explore)
2. Executar ctx 01 (DaisyUI nav) já com o nome novo da aba
3. Executar ctx 04 (forecast sem ML, remove Treinar)
4. Implementar consolidação Insights ↔ IA (uma change só)
5. Card de destaque no Resumo (depende de novo endpoint)
6. Ajustar ctx 10 (chat) conforme a opção escolhida
```
