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

#### 1. Onboarding / Invite flow
```
Hoje: sem fluxo de convite de novos membros
Problema: não tem como o owner adicionar alguém da família sem acesso de admin
Solução: 
  - Link de convite com código único (expires in 24h)
  - Ou convite por email
  - Novo usuário cria conta e já entra no tenant correto
```

#### 2. Notificações
```
Hoje: insights ficam no app, sem notificação push/email
Problema: usuário precisa abrir o app pra ver o insight do dia
Solução mínima: email diário/semanal com digest + insight do dia
Solução completa: push notification (PWA) ou WhatsApp
```

#### 3. Gestão manual de transações
```
Hoje: tudo vem do Pluggy (automático)
Problema: dinheiro em espécie, transferências não capturadas, ajustes
Solução: 
  - Form de entrada manual de transação
  - Edição de categoria de transação existente
  - Ocultação de transação (ruído)
```

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

#### 10. PWA (Progressive Web App)
```
O app é mobile-first e roda no browser
PWA daria: ícone na tela inicial, push notifications, offline básico
Custo: manifest.json + service worker
Benefício: push notification (viabiliza contexto de "notificações")
```

#### 11. Compartilhamento de insights
```
"Esse mês eu economizei R$ 500 em alimentação" → story no Instagram
Estilo Spotify Wrapped para finanças
Baixo esforço, alto impacto de marketing
```

#### 12. Conexão com mais bancos / Pix
```
Pluggy já suporta vários bancos
Adicionar fluxo de reconexão quando token Pluggy expira
Categorização automática de Pix por descrição
```

#### 13. Integração com Notion / Google Sheets
```
Alguns usuários querem os dados no próprio Notion ou Sheets
Export/webhook para ferramentas externas
```

---

## O que podemos adicionar nas changes atuais em andamento

### Em fix-digest-display (já em andamento)
- **Junto:** mostrar data/hora da última atualização do digest
- **Junto:** botão "Gerar agora" para forçar novo digest (apenas owner)

### Em daily-ml-insights / forecast-sem-ml
- **Junto:** campo de "expectativa do usuário" na previsão
  ("Eu acho que vou gastar menos em alimentação este mês")
  → LLM usa essa expectativa para personalizar a mensagem

### Em admin-in-app-roles
- **Junto ao onboarding:** código de convite gerado pelo owner
- **Junto ao settings:** remoção de conta (LGPD compliance)

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

## Sugestão de ordem de execução

```
Agora (contextos prontos para virar change):
  01 → UI/Navegação DaisyUI (base para tudo visual)
  02 → Workers consolidados (simplifica infra)
  04 → Forecast sem ML (simplifica produto)
  03 → Admin no app + Roles (habilita onboarding)

Depois (novas features):
  A → Onboarding / Invite (depende de roles)
  B → Orçamento por categoria (feature de alto valor)
  C → Transações manuais (cobertura de casos de borda)
  D → Notificações por email (retenção)
  E → Metas financeiras (gamificação)
  F → PWA + Push notification (mobile experience)
  G → Dark mode (polimento visual)
```
