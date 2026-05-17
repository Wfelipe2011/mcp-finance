## 1. Preparação e matriz de migração

- [x] 1.1 Mapear todos os imports MUI no client e classificar por tipo (layout, formulário, chart, ícone)
- [x] 1.2 Definir matriz de equivalência MUI para Tremor/Tailwind por componente crítico
- [x] 1.3 Definir plano de ondas com critérios de aceite e rollback por onda

## 2. Onda 1 — Shell e navegação principal

- [x] 2.1 Migrar App shell para Tremor/Tailwind preservando as 6 abas e estados globais
- [x] 2.2 Substituir navegação inferior e cartões base sem dependência de classes Mui
- [x] 2.3 Validar build do client sem erros após a onda 1

## 3. Onda 2 — Formulários e overlays

- [x] 3.1 Migrar LoginScreen para componentes Tremor/Tailwind mantendo fluxo de autenticação
- [x] 3.2 Migrar MonthPicker e ConfigDialog com foco em acessibilidade e usabilidade
- [x] 3.3 Preservar estados de loading, sucesso e erro nos fluxos de formulário

## 4. Onda 3 — Migração de gráficos financeiros

- [x] 4.1 Migrar gráficos de linha e barra para Tremor/Recharts mantendo semântica de séries
- [x] 4.2 Migrar gráficos donut/pizza preservando legendas e distribuição de categorias
- [x] 4.3 Ajustar responsividade de gráficos em mobile e desktop
- [x] 4.4 Atualizar Previsão para tabela e gráfico sem dependência de classes Mui

## 5. Onda 4 — Limpeza de stack e testes

- [x] 5.1 Remover dependências @mui/material, @mui/icons-material, @mui/x-charts, @emotion/react e @emotion/styled do client/package.json
- [x] 5.2 Atualizar testes para usar papéis ARIA, texto e test IDs estáveis em vez de classes Mui
- [x] 5.3 Executar build e suíte de testes relevantes do client

## 6. Validação incremental com MCP browser tools

- [x] 6.1 Ao final de cada onda, abrir o app no browser tool e navegar pelas abas impactadas
- [x] 6.2 Capturar screenshot e leitura de estado da página para cada validação de onda
- [x] 6.3 Interromper avanço para próxima onda quando houver erro de runtime visível

## 7. Validação final e readiness de release

- [x] 7.1 Executar build final do client com zero erros TypeScript
- [x] 7.2 Validar visualmente as 6 abas em ambiente local via MCP browser tools
- [ ] 7.3 Após deploy, executar smoke test em produção e confirmar ausência de crash crítico

> Observação 7.3: smoke test executado em `https://event.wfelipe.com.br/` detectou crash crítico (`Minified MUI error #9`). Esta task permanece pendente até novo deploy do frontend e revalidação.
