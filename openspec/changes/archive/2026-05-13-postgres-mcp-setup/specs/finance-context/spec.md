## ADDED Requirements

### Requirement: Arquivo de contexto semântico persistente do domínio financeiro
O repositório SHALL conter um arquivo `docs/finance-context.md` que serve como memória de longo prazo para agentes de IA. O arquivo SHALL documentar: o domínio financeiro do projeto, o schema de dados (tabelas, campos e seus significados), categorias e enumerações usadas pela API Pluggy, e uma seção de Descobertas acumuladas onde agente e usuário anotam padrões, queries úteis e anomalias observadas.

#### Scenario: Agente encontra contexto de domínio ao iniciar exploração
- **WHEN** o agente lê `docs/finance-context.md` no início de uma sessão de análise
- **THEN** obtém descrição das 6 tabelas, significado dos campos principais, enumerações de `type` para `accounts` e `transactions`, e exemplos de queries úteis

#### Scenario: Descoberta é anotada de forma persistente
- **WHEN** o agente ou usuário identifica um padrão relevante durante exploração (ex: "transações com category = NULL são estornos")
- **THEN** a descoberta pode ser adicionada na seção `## Descobertas` com data e descrição, e o arquivo é commitado para persistir no histórico

#### Scenario: Contexto referenciado em sessão do Copilot
- **WHEN** o usuário inicia uma sessão de análise com `#file:docs/finance-context.md` no prompt
- **THEN** o agente tem acesso ao contexto semântico completo sem precisar re-explorar o schema do zero

### Requirement: Estrutura do arquivo de contexto permite atualizações incrementais
O `docs/finance-context.md` SHALL ter seções claramente delimitadas que permitam atualizações pontuais sem reescrever o arquivo inteiro: Schema, Domínio e Regras de Negócio, Enumerações, Queries de Referência, e Descobertas.

#### Scenario: Nova descoberta adicionada sem quebrar estrutura
- **WHEN** uma nova descoberta é adicionada na seção `## Descobertas`
- **THEN** as demais seções permanecem intactas e o arquivo continua válido como contexto
