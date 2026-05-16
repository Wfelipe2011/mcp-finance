## 1. Instalação do postgres-mcp

- [x] 1.1 Verificar versão do Python disponível: `python3 --version` (requer 3.12+)
- [x] 1.2 Instalar `postgres-mcp` globalmente: `pip install postgres-mcp`
- [x] 1.3 Confirmar que o comando está no PATH: `postgres-mcp --version`

## 2. Configuração do workspace VS Code

- [x] 2.1 Criar `.vscode/mcp.json` com configuração do servidor `postgres-finance` apontando para `localhost:5434`, `--access-mode=restricted`, e `DATABASE_URI` no campo `env`
- [x] 2.2 Adicionar `.vscode/mcp.json` ao `.gitignore` (credenciais não versionadas)
- [x] 2.3 Verificar que o Copilot Agent carrega o servidor: abrir VS Code, ativar agent mode, confirmar que `postgres-finance` aparece na lista de MCP servers disponíveis
- [x] 2.4 Testar tool `execute_sql` com query simples: `SELECT COUNT(*) FROM transactions`

## 3. Arquivo de contexto semântico

- [x] 3.1 Criar diretório `docs/` na raiz do projeto
- [x] 3.2 Criar `docs/finance-context.md` com seções: Visão Geral, Schema (6 tabelas), Domínio e Regras de Negócio, Enumerações (account type, transaction type/status), Queries de Referência, Descobertas
- [x] 3.3 Preencher seção Schema com descrição de cada tabela e campos principais (baseado em `src/infrastructure/db/schema.sql`)
- [x] 3.4 Preencher seção Enumerações com valores conhecidos de `type`, `subtype`, `status` para `accounts` e `transactions` (a partir de consultas no banco)
- [x] 3.5 Preencher seção Queries de Referência com 3-5 queries analíticas iniciais úteis (gastos por mês, saldo por banco, investimentos por tipo)

## 4. Atualizar README

- [x] 4.1 Adicionar seção "Análise de Dados com Copilot" no `README.md` explicando como usar o MCP: instalar `postgres-mcp`, configurar `.vscode/mcp.json`, e referenciar `docs/finance-context.md` em prompts

## 5. Validação

- [x] 5.1 Confirmar que `execute_sql` com SELECT retorna dados corretos (`SELECT COUNT(*) FROM transactions` → 3291)
- [x] 5.2 Confirmar que modo restricted bloqueia escrita (testar `INSERT INTO items VALUES (...)` → deve falhar)
- [x] 5.3 Confirmar que `get_object_details` retorna schema correto para a tabela `transactions`
- [x] 5.4 Fazer uma sessão de exploração com o agente referenciando `#file:docs/finance-context.md` e anotar uma descoberta na seção Descobertas
