## Context

O projeto possui um backend Bun com PostgreSQL, RLS e isolamento por tenant, alem de rotas HTTP e queries consolidadas em BunPgAdapter para cashflow, gastos, transacoes, runway, patrimonio, compromissos, digest e forecast. A sessao de discovery mostrou que os dados e fluxos necessarios ja existem, mas nao ha um servidor MCP ativo no runtime atual para expor essas capacidades para agentes.

Os specs atuais de MCP estao desatualizados em relacao ao produto atual: ainda refletem um conjunto antigo de tools e contratos de parametro que nao cobrem as perguntas reais do app e das operacoes de AI/ML. O objetivo deste design e atualizar mcp-server e mcp-view-tools para um catalogo unico de 12 tools tenant-safe.

Stakeholders principais:

- Produto e usuarios finais (perguntas financeiras e investigacao rapida)
- Time de dados/AI (digest, forecast, cobertura de enrichment)
- Time de operacao (filas, workers e saude do pipeline)

## Goals / Non-Goals

**Goals:**

- Expor um servidor MCP HTTP no stack atual com suporte a tools.
- Definir e implementar um catalogo de 12 tools com contrato estavel de input/output.
- Garantir isolamento multi-tenant consistente em todas as tools.
- Reaproveitar ao maximo as queries e views ja existentes para reduzir risco.
- Padronizar validacao e erros de tools para melhorar autorecuperacao do agente.

**Non-Goals:**

- Reprojetar schema do banco ou recriar cubos do zero.
- Implementar ferramentas de escrita de dados financeiros por MCP.
- Substituir as rotas HTTP do app cliente.
- Resolver todas as lacunas historicas de dados de AI/forecast nesta change.

## Decisions

### D1. Servidor MCP em Streamable HTTP com registro explicito de tools

Decisao:

- Implementar servidor MCP HTTP no backend Bun, com capabilities de tools.
- Usar schemas de input com validacao forte e limites de parametros.

Rationale:

- Permite uso por clientes MCP que nao suportam resources.
- Mantem alinhamento com o contrato MCP atual focado em tools.

Alternativas consideradas:

- Stdio apenas: simples localmente, mas pior para integracoes e operacao.
- Reativar resources: menor compatibilidade com clientes e agentes.

### D2. Catalogo de 12 tools dividido por dominio funcional

Decisao:

- Organizar o catalogo em 3 grupos:
  - Analiticas financeiras: 1-9
  - Estado AI/ML: 10-11
  - Saude operacional: 12

Rationale:

- Reduz sobreposicao entre tools e melhora descoberta por agentes.
- Facilita priorizacao por fase sem quebrar o contrato final.

Alternativas consideradas:

- Poucas tools genericas SQL-like: flexivel, porem baixa ergonomia para agentes.
- Muitas tools ultra-granulares: alta complexidade e acoplamento.

### D3. Tenant safety por default em todas as tools

Decisao:

- Toda tool tenant-scoped deve aplicar set_config app.tenant_id antes de consultar.
- Input com tenant_id obrigatorio quando nao houver contexto autenticado.
- Quando houver contexto autenticado, tenant_id recebido deve bater com o tenant da sessao.

Rationale:

- Evita vazamento cross-tenant.
- Mantem paridade com comportamento atual da API.

Alternativas consideradas:

- Inferir tenant apenas por token interno do servidor: inviavel para cenarios sem auth de sessao MCP.
- Aceitar tenant_id sem validacao: risco de seguranca inaceitavel.

### D4. Reuso de BunPgAdapter e views existentes como fonte primaria

Decisao:

- Reaproveitar metodos existentes do adapter sempre que possivel.
- Criar apenas queries novas quando o contrato da tool exigir dado nao coberto.

Rationale:

- Reduz risco de regressao.
- Preserva logica de negocio ja validada no app.

Alternativas consideradas:

- Implementar SQL ad-hoc em cada handler MCP: rapido no curto prazo, caro para manter.

### D5. Contrato de resposta com conteudo textual e estrutura JSON

Decisao:

- Retornar texto legivel no content text e payload estruturado para parsing.
- Em falhas de validacao/execucao, retornar isError true com mensagem objetiva.

Rationale:

- Facilita consumo por LLM e por clientes que usam structured content.
- Melhora comportamento de self-correction do agente.

Alternativas consideradas:

- Apenas texto: perde estrutura para composicao entre tools.
- Apenas JSON: pior UX em clientes centrados em texto.

### D6. Ferramentas operacionais com escopo controlado

Decisao:

- get_pipeline_health deve ser tratada como tool de operacao.
- Exigir escopo explicito para dados globais (include_global true) e validar permissao.

Rationale:

- Evita exposicao acidental de sinais operacionais sensiveis.

Alternativas consideradas:

- Expor sempre dados globais: aumenta risco de vazamento de contexto entre tenants.

## Risks / Trade-offs

- [Risk] Divergencia entre contratos das tools e dados historicos incompletos (digest/forecast) -> Mitigation: tools de status (digest_status e forecast_status) devem explicitar disponibilidade e cobertura.
- [Risk] Sobrecarga de queries pesadas em periodos longos -> Mitigation: limites de janela, paginação, e validacao de range.
- [Risk] Mudancas no catalogo quebrando prompts existentes -> Mitigation: documentar versao do catalogo e manter aliases temporarios quando necessario.
- [Risk] Falso senso de anomalia por metodo unico -> Mitigation: oferecer metodo hybrid (AI + estatistico) com metadados de motivo.
- [Trade-off] Mais ferramentas aumentam superficie de manutencao -> Beneficio: maior precisão para perguntas reais e menor necessidade de prompt complexo.

## Migration Plan

1. Atualizar specs de mcp-server e mcp-view-tools para o novo contrato.
2. Implementar servidor MCP e registro das 12 tools atras de env flag de rollout.
3. Validar localmente com tenant real e cenarios de erro de validacao.
4. Habilitar em ambiente de teste e observar latencia/erros.
5. Liberar em producao com monitoramento de falhas de tool call.

Rollback:

- Desabilitar endpoint MCP via env.
- Reverter para versao anterior do registro de tools.

## Open Questions

1. A autenticacao do endpoint MCP sera obrigatoria na primeira release ou somente tenant_id validado por entrada?
2. get_pipeline_health deve ficar restrita a role de admin desde a primeira versao?
3. O contrato final das tools deve incluir versionamento explicito (ex: v1) no nome das tools?
