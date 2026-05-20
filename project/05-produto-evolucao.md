# Contexto 05 — MVP → Produto: O que estamos adiando?

## Objetivo desta rodada de explore

Catalogar o que um **produto real** de finanças pessoais familiares tem que um **MVP** não tem, e priorizar o que faz mais sentido construir agora que temos infra, IA e multi-tenant funcionando.

---

## O que já temos (MVP completo)

```
✅ Multi-tenant com RLS
✅ Sincronização bancária via Pluggy (open banking)
✅ Categorização automática via LLM (enrich)
✅ Análise mensal via LLM (digest)
✅ Previsão via ML / views SQL
✅ Dashboard financeiro completo (Resumo, Gastos, Próx. Mês, Investimentos)
✅ Insights de IA com anomalias
✅ Previsão diária com probabilidade
✅ Admin panel (multi-tenant)
✅ Auth com sessão TTL
✅ Suporte a múltiplos membros por família
```

---

## O que falta para ser um produto

### 🔴 Alta prioridade (bloqueia uso real por mais usuários)

#### 4. Metas financeiras (Goals)
```
Hoje: sem metas
Problema: usuário quer saber "quando vou conseguir comprar X?"
Solução:
  - Criar meta (nome, valor alvo, prazo)
  - Acompanhar progresso
  - IA comenta na análise mensal se está no caminho
```

---

### 🟡 Média prioridade (diferencial competitivo)

#### 5. Orçamento por categoria
```
Hoje: sem orçamento definido
Problema: usuário quer saber se está dentro do limite de "Alimentação"
Solução:
  - Definir limite mensal por categoria
  - Alertas quando atingir 80% / 100% do limite
  - Visualização de "barra de progresso" do orçamento na tela Gastos
```

#### 6. Transações recorrentes / assinaturas gerenciáveis
```
Hoje: "Recorrentes identificados" é read-only
Problema: usuário quer cancelar, marcar como ignorada ou renomear
Solução:
  - Editar nome/categoria de recorrente
  - Marcar como "ciente" (não alertar mais)
  - Estimativa de custo anual das assinaturas
```

#### 7. Relatórios exportáveis
```
Hoje: sem exportação
Problema: imposto de renda, planejamento com contador
Solução:
  - Exportar CSV / PDF de transações por período
  - Filtros por categoria, membro, conta
```

#### 8. Múltiplas contas de um mesmo banco
```
Hoje: estrutura suporta, mas UX pode ser confusa
Problema: Nubank corrente + Nubank investimento aparecem como separados
Solução: agrupar por instituição na UI com sub-contas
```

---

### 🟢 Baixa prioridade / futuro

#### 9. Dark mode
```
O design system (DESIGN.md) é baseado em Binance dark-first
Tailwind dark: suporta dark mode com class="dark"
DaisyUI: tema dark nativo
Quando implementar: depois da migração DaisyUI (contexto 01)
```

---

## Questões para o explore

1. **Metas financeiras**: isso é a próxima grande feature depois de UI? Ou orçamento por categoria tem mais impacto imediato?
2. **Notificações**: email é suficiente para começar? O app vai virar PWA algum dia (push notification)?
3. **Transações manuais**: o Pluggy já cobre bem o uso real? Quantas vezes por mês Wilson precisa lançar algo manualmente?
4. **Compartilhamento de insights**: válido como feature de marketing viral? (Tipo Spotify Wrapped para finanças)

---

## Referências

- **Pluggy API** (reconexão de contas): https://docs.pluggy.ai/
- **PWA manifest**: https://developer.mozilla.org/en-US/docs/Web/Manifest
- **DaisyUI Progress** (barra de orçamento): https://daisyui.com/components/progress/
- **DaisyUI Steps** (onboarding): https://daisyui.com/components/steps/
- **DaisyUI Timeline** (histórico de metas): https://daisyui.com/components/timeline/
- **DaisyUI Toast** (alertas de orçamento): https://daisyui.com/components/toast/

---

