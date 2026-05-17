## 1. Shell mobile-first e estrutura base

- [x] 1.1 Revisar containers da shell para priorizar mobile-first (base em viewport estreita)
- [x] 1.2 Definir breakpoints progressivos para tablet/desktop sem alterar semântica das abas
- [x] 1.3 Garantir largura/fluxo dos cards sem overflow horizontal em mobile

## 2. Tabbar fixa com área segura inferior

- [x] 2.1 Definir token/constante de altura da tabbar fixa e margem de segurança
- [x] 2.2 Aplicar safe-area inferior nos wrappers roláveis de Resumo, Gastos, Próx. Mês, Previsão, Investimentos e Insights
- [x] 2.3 Ajustar posicionamento de feedbacks flutuantes para não colidir com a tabbar
- [x] 2.4 Validar visualmente fim de scroll em listas, tabelas e gráficos sem conteúdo coberto

## 3. Espaçamento interno consistente em cards

- [x] 3.1 Definir baseline de padding interno e gap vertical para cards de KPI e resumo
- [x] 3.2 Aplicar baseline nos cards de Resumo e Próx. Mês
- [x] 3.3 Aplicar baseline nos cards de Gastos e Investimentos
- [x] 3.4 Aplicar baseline nos cards de Previsão e Insights

## 4. Legibilidade de gráficos e tabelas em viewport reduzida

- [x] 4.1 Ajustar renderização de labels longas em gráficos para evitar concatenação/colisão
- [x] 4.2 Garantir visibilidade de eixos principais sem corte crítico em mobile
- [x] 4.3 Ajustar tabela da Previsão para leitura completa de cabeçalhos/valores em viewport estreita
- [x] 4.4 Garantir que últimas linhas da tabela da Previsão permaneçam visíveis acima da tabbar fixa

## 5. Validação funcional e visual

- [x] 5.1 Validar fluxo de navegação entre as 6 abas em mobile-first sem regressão visual
- [x] 5.2 Executar build do client com zero erros TypeScript
- [x] 5.3 Executar testes relevantes do client e atualizar snapshots necessários
- [x] 5.4 Executar validação via browser tools com evidências de screenshot/read_page para os pontos críticos
