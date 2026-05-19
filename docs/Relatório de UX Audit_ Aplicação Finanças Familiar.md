# Relatório de UX Audit: Aplicação Finanças Familiar

## 1. Introdução

Este relatório apresenta uma auditoria de UX (User Experience) da aplicação web "Finanças Familiar", com foco na arquitetura da informação e na relevância dos dados apresentados. O objetivo é identificar oportunidades de melhoria para otimizar a experiência do usuário, destacando o valor das previsões de Machine Learning (ML) e das mensagens humanizadas de Large Language Models (LLM).

## 2. Inventário e Catalogação de Telas e Elementos

A seguir, detalhamos as telas principais da aplicação, seus componentes visuais, dados/métricas exibidas, seus significados no contexto financeiro e os casos de uso primários que cada tela atende.

### 2.1. Tela: Resumo (Home)

| Componente Visual | Dado/Métrica Exibida | Significado no Contexto Financeiro | Caso de Uso Principal |
|---|---|---|---|
| Seletor de Período | Mês/Ano | Permite ao usuário visualizar os dados financeiros de um período específico. | Selecionar período de análise. |
| Card: Resultado Mensal | Valor monetário (ex: R$ 8.337,72) | Saldo consolidado entre receitas e despesas do mês selecionado. | Visualizar saldo geral do mês. |
| Card: Mensagem de IA | Status da análise de IA | Indica se a análise de IA está disponível para o mês. | Verificar disponibilidade de insights. |
| Card: Receitas | Valor monetário (ex: R$ 11.460,57) | Soma total das entradas financeiras no mês. | Acompanhar total de ganhos. |
| Card: Despesas | Valor monetário (ex: R$ 3.122,85) | Soma total das saídas financeiras no mês. | Acompanhar total de gastos. |
| Card: Fôlego Financeiro | Fôlego imediato (dias) | Número de dias que o usuário consegue manter o padrão de gastos com o saldo atual. | Avaliar liquidez de curto prazo. |
| Card: Fôlego Financeiro | Fôlego total (dias) | Número de dias que o usuário consegue manter o padrão de gastos considerando todos os recursos disponíveis. | Avaliar liquidez de longo prazo. |
| Card: Patrimônio em Conta | Valor total (ex: R$ 4.010,04) | Soma total dos valores disponíveis em todas as contas bancárias. | Visualizar patrimônio líquido disponível. |
| Card: Patrimônio em Conta | Detalhamento por instituição (PicPay, Nubank) | Saldo individual em cada conta bancária. | Monitorar saldos por banco. |

### 2.2. Tela: Gastos

| Componente Visual | Dado/Métrica Exibida | Significado no Contexto Financeiro | Caso de Uso Principal |
|---|---|---|---|
| Card: Total Gasto | Valor monetário (ex: R$ 3.122,85) | Soma consolidada de todas as despesas no mês selecionado. | Acompanhar o total gasto no mês. |
| Gráfico: "Por onde foi" | Gráfico de rosca/pizza com categorias (Alimentação, Compras, etc.) | Distribuição percentual dos gastos entre as principais categorias. | Entender a alocação dos gastos. |
| Gráfico: "Por categoria" | Gráfico de barras horizontais com subcategorias e valores | Detalhamento dos gastos dentro de subcategorias específicas. | Analisar gastos detalhados por tipo. |
| Lista: "Novos este mês" | Transações/Categorias novas com valor e tag "NOVO" | Identifica novos padrões de gastos ou despesas pontuais. | Reconhecer novos hábitos de consumo. |
| Lista: "Média 3 meses" | Comparativo de gastos atuais vs. média histórica com tendência | Indica se os gastos em uma categoria estão acima ou abaixo da média dos últimos 3 meses. | Avaliar tendências de gastos. |
| Lista: "Recorrentes identificados" | Nome do serviço, categoria, valor e periodicidade (ex: iFood, R$ 79,96, monthly) | Lista de despesas que se repetem regularmente. | Identificar e gerenciar gastos fixos/recorrentes. |

### 2.3. Tela: Próx. Mês

| Componente Visual | Dado/Métrica Exibida | Significado no Contexto Financeiro | Caso de Uso Principal |
|---|---|---|---|
| Card: Projeção de Cashflow | Valor monetário (ex: R$ -48,40) | Estimativa do saldo financeiro para o próximo mês. | Prever o saldo futuro. |
| Card: Compromissos em Aberto | Valor total e quantidade de compromissos ativos | Soma dos valores de parcelamento, assinaturas e dívidas pendentes. | Monitorar obrigações financeiras futuras. |
| Card: Fôlego Financeiro | Fôlego imediato e Fôlego total (dias) | Repetição dos indicadores de liquidez, focados na projeção futura. | Avaliar capacidade de pagamento futura. |
| Gráfico: "Evolução do Cashflow" | Gráfico de linha/área com projeção mensal | Visualização da tendência do cashflow ao longo de vários meses. | Analisar a saúde financeira a médio/longo prazo. |
| Lista: "Compromissos em Aberto" | Detalhamento de parcelamentos (nome, parcela atual/total, valor restante, responsável, cartão) | Lista de todas as despesas futuras com seus detalhes. | Gerenciar e planejar pagamentos futuros. |
| Botão: "Ver todos" | Ação de expandir a lista de compromissos | Permite visualizar todos os compromissos em aberto. | Acessar lista completa de compromissos. |

### 2.4. Tela: Investimentos

| Componente Visual | Dado/Métrica Exibida | Significado no Contexto Financeiro | Caso de Uso Principal |
|---|---|---|---|
| Card: Patrimônio Total | Valor monetário (ex: R$ 4.010,06) | Soma total de todos os ativos financeiros do usuário. | Acompanhar o crescimento do patrimônio. |
| Gráfico: "Distribuição consolidada por tipo de conta" | Gráfico de rosca com alocação por banco/conta | Representação visual da distribuição dos investimentos entre diferentes instituições. | Entender a diversificação dos ativos. |
| Gráfico: "Movimentações (últimos 6 meses)" | Gráfico de barras/linha com evolução do patrimônio | Histórico da variação do patrimônio ao longo dos últimos seis meses. | Analisar o desempenho dos investimentos. |

### 2.5. Tela: Insights

| Componente Visual | Dado/Métrica Exibida | Significado no Contexto Financeiro | Caso de Uso Principal |
|---|---|---|---|
| Título: Insights | Descrição sobre leitura gerada por IA | Informa que a seção oferece análises e alertas baseados em IA. | Entender o propósito da seção. |
| Card: Análise do Mês | Texto descritivo da IA (sinais positivos, alertas) | Resumo humanizado das principais observações financeiras do mês. | Obter uma análise contextualizada das finanças. |
| Card: Anomalias detectadas | Lista de gastos fora do padrão ou mensagem "Nenhuma anomalia detectada" | Identifica despesas incomuns ou inesperadas que podem requerer atenção. | Ser alertado sobre gastos atípicos. |

### 2.6. Tela: IA (Sub-abas: Insights, Previsões, Treinar)

**Sub-aba: Insights**
Esta sub-aba é uma repetição da "Tela 5: Insights", apresentando os mesmos elementos e funcionalidades.

**Sub-aba: Previsões**

| Componente Visual | Dado/Métrica Exibida | Significado no Contexto Financeiro | Caso de Uso Principal |
|---|---|---|---|
| Card: Probabilidade de Gasto Hoje | Categoria, mensagem preditiva, probabilidade (%), estimativa de valor | Previsão de gastos específicos para o dia atual, com base em padrões de comportamento. | Antecipar gastos diários e planejar. |
| Lista: "Outras categorias prováveis hoje" | Categorias com % de probabilidade e valor estimado | Sugere outras despesas que podem ocorrer no dia. | Ter uma visão mais ampla das possíveis despesas diárias. |
| Card: Cashflow Projetado | Valor monetário (ex: R$ 41.486,92) | Soma prevista do cashflow para o próximo mês, conforme o forecast. | Obter uma projeção de cashflow de curto prazo. |
| Gráfico: "Evolução do cashflow" | Gráfico de linha/área com projeção de cashflow | Visualização da tendência do cashflow ao longo de vários meses. | Analisar a saúde financeira a médio/longo prazo. |
| Gráfico: "Gastos por grupo – real + previsto" | Comparativo temporal de gastos reais e previstos por grupo | Mostra a evolução dos gastos reais e as projeções futuras por categoria. | Comparar desempenho real com previsões. |
| Tabela: "Categorias – real vs. previsto" | Categoria, Grupo, Real (mês atual), Previsto (próximo mês) | Detalhamento comparativo dos gastos reais do mês atual e os previstos para o próximo mês por categoria. | Analisar desvios entre gastos reais e previstos. |

**Sub-aba: Treinar**

| Componente Visual | Dado/Métrica Exibida | Significado no Contexto Financeiro | Caso de Uso Principal |
|---|---|---|---|
| Card: Modelo em produção | ID do modelo, MAE, MAPE, Acurácia | Informações sobre o modelo de IA atualmente em uso, incluindo métricas de desempenho. | Monitorar a performance do modelo de IA. |
| Botão: "Re-treinar" | Ação de iniciar novo treinamento do modelo | Permite ao usuário iniciar um novo ciclo de treinamento para o modelo de IA. | Atualizar o modelo com novos dados. |
| Lista: "Versões do modelo" | Histórico de modelos (production/staging, tamanho, % de acertos, botões "Ativar" e ".pkl") | Lista de versões anteriores do modelo de IA, com a opção de ativar ou excluir. | Gerenciar e testar diferentes versões do modelo. |
| Lista: "Categorias excluídas do treinamento" | Checkboxes para ignorar categorias específicas | Permite ao usuário definir quais categorias de gastos não devem ser consideradas no treinamento do modelo. | Refinar o treinamento do modelo. |
| Lista: "Conjunto de teste" | Transações com data, categoria, valor real vs. previsto, % de desvio, botão | Apresenta transações que o modelo previu com maior desvio, permitindo feedback para melhoria. | Identificar e corrigir erros de previsão do modelo. |

### 2.7. Modal: Configurações

| Componente Visual | Dado/Métrica Exibida | Significado no Contexto Financeiro | Caso de Uso Principal |
|---|---|---|---|
| Seção: Membros | Lista de usuários (ex: Wilson Felipe da Silva) | Exibe os membros associados à conta familiar. | Gerenciar usuários da aplicação. |
| Campo: Nome exibido | Input para alterar o nome (ex: Wilson) | Permite ao usuário personalizar o nome de exibição na aplicação. | Personalizar perfil do usuário. |

## 3. Análise Crítica de Relevância (Sinal vs. Ruído)

Com base nas perguntas comuns dos usuários ("Onde foi o meu dinheiro, com o que eu gastei?", "Tem assinaturas que não uso?", "Como está as parcelas do meu cartão?", "O quanto está comprometido meu futuro com as decisões do passado?", "Quais dicas devo receber para sair de pagador de boleto e virar um investidor?", "Onde está os furos do orçamento?"), a seguir, avalio a utilidade das informações e identifico possíveis ruídos na arquitetura atual.

*   **Redundância e Posicionamento Inadequado:**
    *   A sub-aba "Insights" dentro da tela "IA" é uma repetição exata da "Tela: Insights". Isso gera redundância e pode confundir o usuário sobre onde encontrar as informações mais relevantes de IA. A seção de IA deveria focar em configurações e treinamento, enquanto os insights deveriam ser mais proeminentes e acessíveis diretamente.
    *   O "Card: Fôlego Financeiro" aparece tanto na "Tela: Resumo (Home)" quanto na "Tela: Próx. Mês". Embora seja uma métrica importante, sua repetição pode ser otimizada. Na tela de Resumo, um resumo mais conciso pode ser suficiente, enquanto na tela "Próx. Mês", o detalhe da projeção é mais pertinente.

*   **Foco Insuficiente nas Previsões e Mensagens Humanizadas:**
    *   As previsões de ML e as mensagens do LLM são o grande diferencial do produto, mas não estão suficientemente destacadas. Na "Tela: Resumo (Home)", a "Card: Mensagem de IA" apenas indica o status da análise, sem apresentar o insight em si. Os usuários querem saber "O quanto está comprometido meu futuro com as decisões do passado?" e "Quais dicas devo receber para sair de pagador de boleto e virar um investidor?". Essas respostas deveriam ser o ponto central da experiência.
    *   A "Tela: IA" com as sub-abas "Previsões" e "Treinar" parece ser mais voltada para um usuário avançado ou para o próprio time de desenvolvimento/gestão do modelo. As informações de "Modelo em produção", "Re-treinar", "Versões do modelo" e "Categorias excluídas do treinamento" são ruído para o usuário final que busca apenas entender suas finanças e tomar decisões.

*   **Informações "Jogadas" ou Descontextualizadas:**
    *   Na "Tela: Gastos", a "Lista: "Novos este mês"" e "Lista: "Média 3 meses"" são úteis, mas sua apresentação pode ser mais integrada com as perguntas do usuário. Por exemplo, "Onde foi o meu dinheiro, com o que eu gastei?" poderia ser respondida com uma visualização mais interativa que combine esses dados.
    *   A "Lista: "Recorrentes identificados"" na tela de Gastos é crucial para a pergunta "Tem assinaturas que não uso?". No entanto, sua visibilidade e ação podem ser aprimoradas para permitir ao usuário gerenciar essas assinaturas diretamente ou receber alertas sobre elas.
    *   Na "Tela: Próx. Mês", a "Lista: "Compromissos em Aberto"" responde diretamente à pergunta "Como está as parcelas do meu cartão?". A interface poderia dar mais destaque a isso, talvez com um resumo visual dos próximos pagamentos.

*   **Potencial Não Explorado para Dicas e Ações:**
    *   As perguntas "Quais dicas devo receber para sair de pagador de boleto e virar um investidor?" e "Onde está os furos do orçamento?" indicam uma necessidade de orientação proativa. As mensagens do LLM deveriam ser o veículo principal para entregar essas dicas personalizadas, mas não há um local claro onde essas "dicas" são apresentadas de forma centralizada e acionável.
    *   A "Tela: Insights" e a sub-aba "Previsões" na "Tela: IA" contêm informações valiosas, mas a conexão entre a análise e a ação recomendada não é explícita. Por exemplo, se a IA prevê um gasto alto, qual a sugestão para mitigar isso?

## 4. Sugestões de Melhoria

Para otimizar a arquitetura da informação e destacar o valor das previsões de ML e mensagens do LLM, proponho as seguintes melhorias:

### 4.1. Reorganização da Hierarquia da Informação para Destacar ML e LLM

*   **Tela Principal (Home/Dashboard):**
    *   **Priorizar Insights e Previsões:** O topo da tela deve apresentar um "Card de Insights e Ações" gerado pelo LLM, respondendo diretamente às perguntas do usuário. Ex: "Você gastou X% a mais em alimentação este mês, considere ajustar seu orçamento para evitar um saldo negativo no próximo mês. [Ver detalhes] [Receber dicas]."
    *   **Resumo Financeiro Essencial:** Abaixo dos insights, manter um resumo conciso de Receitas, Despesas e Saldo Mensal, mas com um link claro para a tela de "Gastos" para detalhes.
    *   **Fôlego Financeiro Proativo:** Apresentar o "Fôlego Financeiro" de forma mais visual e com uma mensagem preditiva, por exemplo, "Com seu padrão de gastos atual, seu fôlego financeiro é de X dias. A IA prevê que você pode ter dificuldades em Y dias se não houver mudanças."
    *   **Próximos Compromissos Chave:** Um card resumido dos "Compromissos em Aberto" mais urgentes ou de maior valor, com um link para a tela "Próx. Mês" para a lista completa.

*   **Tela "Insights e Recomendações" (Nova ou Renomeada):**
    *   Esta tela seria o hub central para todas as análises e mensagens humanizadas da IA. A atual "Tela: Insights" e a sub-aba "Insights" da "Tela: IA" seriam consolidadas aqui.
    *   **Categorias de Insights:** Organizar os insights em categorias claras, como "Alertas de Gastos", "Oportunidades de Economia", "Dicas de Investimento", "Análise de Assinaturas", etc.
    *   **Ações Sugeridas:** Cada insight deve vir acompanhado de uma ou mais ações sugeridas, como "Revisar categoria X", "Cancelar assinatura Y", "Explorar investimentos Z".
    *   **Previsões Detalhadas:** Integrar as previsões de gastos diários e cashflow projetado de forma mais visual e interativa, permitindo ao usuário explorar cenários.

*   **Tela "Gerenciamento de Gastos e Orçamento":**
    *   Consolidar a atual "Tela: Gastos" e a "Lista: "Recorrentes identificados"" aqui. Foco em permitir ao usuário categorizar, analisar e gerenciar seus gastos passados e presentes.
    *   **Visualização Interativa:** Melhorar os gráficos de "Por onde foi" e "Por categoria" para serem mais interativos, permitindo drill-down e filtros fáceis.
    *   **Gestão de Assinaturas:** Uma seção dedicada para "Assinaturas e Recorrentes", onde o usuário pode facilmente ver, editar ou cancelar serviços, respondendo à pergunta "Tem assinaturas que não uso?".

*   **Tela "Planejamento Futuro" (Renomeada de "Próx. Mês"):**
    *   Foco em projeções de longo prazo, compromissos futuros e planejamento financeiro. A atual "Tela: Próx. Mês" seria aprimorada aqui.
    *   **Visualização de Compromissos:** Um calendário ou linha do tempo visual para os "Compromissos em Aberto", destacando datas de vencimento e valores.
    *   **Simulador de Cenários:** Permitir ao usuário simular o impacto de diferentes decisões (ex: quitar dívida, fazer um investimento) no seu cashflow futuro.

*   **Tela "Investimentos e Patrimônio":**
    *   Manter o foco atual, mas talvez integrar insights de IA sobre oportunidades de investimento ou otimização de portfólio.

*   **Tela "Configurações e IA Avançada":**
    *   Mover as funcionalidades de "Treinar" da "Tela: IA" para uma seção de "Configurações Avançadas de IA" ou "Gerenciamento de Modelos", acessível apenas para usuários que realmente precisam dessa granularidade. Para o usuário comum, essas informações são ruído.

### 4.2. Informações a Ocultar, Agrupar ou Eliminar

*   **Eliminar/Ocultar:**
    *   **Sub-aba "Insights" dentro da "Tela: IA":** Eliminar esta sub-aba, consolidando seu conteúdo na nova "Tela: Insights e Recomendações".
    *   **Métricas de Modelo de IA (MAE, MAPE, Acurácia):** Ocultar para o usuário final. Essas são métricas técnicas que não agregam valor à experiência do usuário comum. Podem ser mantidas em um painel de administrador ou em uma seção muito avançada.
    *   **Botão "Re-treinar" e "Versões do modelo":** Ocultar para o usuário final. O treinamento do modelo deve ser automatizado ou gerenciado internamente, sem a necessidade de intervenção do usuário comum.
    *   **"Categorias excluídas do treinamento":** Ocultar para o usuário final. A gestão de quais categorias são relevantes para o treinamento deve ser parte da configuração interna do modelo, ou, se for uma funcionalidade para o usuário, deve ser apresentada de forma mais amigável e contextualizada (ex: "Ignorar gastos com presentes para não afetar previsões").

*   **Agrupar/Consolidar:**
    *   **"Card: Fôlego Financeiro":** Consolidar a apresentação desta métrica. Na Home, um resumo visual e preditivo. Na tela de Planejamento Futuro, os detalhes da projeção.
    *   **Informações de Receitas e Despesas:** Na "Tela: Resumo (Home)", agrupar em um card mais compacto, com destaque para o saldo e um CTA para detalhes na tela de Gastos.
    *   **Detalhamento de Patrimônio por Instituição:** Na "Tela: Resumo (Home)", pode ser agrupado em um card de "Patrimônio Total" com um link para detalhes, evitando poluir a tela inicial com muitas informações secundárias.

*   **Reorganizar:**
    *   **Navegação Inferior:** Simplificar a barra de navegação para as telas mais essenciais: Home (com Insights e Previsões), Gastos, Planejamento Futuro, Investimentos, e um ícone de Configurações. A "Tela: IA" como está hoje não deveria ser uma aba principal.

## 5. Geração do PRD (Product Requirements Document)

Com base nas análises e sugestões de melhoria, o próximo passo será a criação de um PRD detalhado para guiar o desenvolvimento das mudanças propostas. Este documento incluirá:

*   **Visão Geral do Produto:** Reforçando o diferencial de ML/LLM.
*   **Objetivos do Negócio e do Usuário:** Alinhando as mudanças com as necessidades dos usuários e os objetivos estratégicos.
*   **Requisitos Funcionais:** Detalhamento das novas telas e funcionalidades, como o "Card de Insights e Ações" e a "Tela: Insights e Recomendações".
*   **Requisitos Não Funcionais:** Performance, segurança, escalabilidade.
*   **Fluxos de Usuário:** Mapeamento dos novos caminhos que o usuário percorrerá.
*   **Protótipos/Wireframes (conceituais):** Esboços de como as novas telas e elementos podem se parecer.
*   **Critérios de Aceitação:** Como as mudanças serão validadas.

Este PRD servirá como um guia claro para as equipes de design e desenvolvimento, garantindo que as melhorias propostas sejam implementadas de forma eficaz e alinhadas com a visão do produto.
