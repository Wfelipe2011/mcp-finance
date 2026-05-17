## ADDED Requirements

### Requirement: Exibição da narrativa de análise mensal de IA
O sistema SHALL exibir a narrativa em português gerada pela IA para o mês selecionado na aba Resumo, quando o digest estiver disponível no banco de dados.

#### Scenario: Digest disponível para o mês selecionado
- **WHEN** o usuário seleciona um mês que possui digest gerado (`status: ready`)
- **THEN** o componente DigestNarrative SHALL renderizar o texto de `narrative_pt`
- **THEN** a narrativa SHALL ser visível na aba Resumo sem erro ou mensagem de fallback

#### Scenario: Digest não disponível para o mês selecionado
- **WHEN** o usuário seleciona um mês sem digest gerado (status `pending` ou ausente)
- **THEN** o componente DigestNarrative SHALL exibir a mensagem de fallback "Análise de IA não disponível para este mês."
- **THEN** nenhum erro SHALL ser lançado para o console ou para o usuário

#### Scenario: Resposta da API com envelope status/data
- **WHEN** `GET /api/digest?month=YYYY-MM` retorna `{ "status": "ready", "data": { ... } }`
- **THEN** `fetchDigest()` SHALL retornar o objeto `data` diretamente ao chamador
- **THEN** o tipo retornado SHALL ser compatível com a interface `Digest`

#### Scenario: Resposta da API com status pending
- **WHEN** `GET /api/digest?month=YYYY-MM` retorna `{ "status": "pending", "coverage": 0.98 }`
- **THEN** `fetchDigest()` SHALL retornar `null`
- **THEN** o estado `digest` no componente SHALL permanecer `null`
