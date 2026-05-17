## ADDED Requirements

### Requirement: Parse defensivo de campos JSONB na leitura
O sistema SHALL fazer parse de campos `notable_expenses` e `structured_summary` ao ler do banco: se o valor retornado for uma string, aplicar `JSON.parse`; se o parse falhar, retornar `null`.

#### Scenario: Campo armazenado como string JSON válida
- **WHEN** o banco retorna `notable_expenses` como string `"[]"` ou `"[{...}]"`
- **THEN** o campo SHALL ser convertido para array JavaScript antes de retornar pela API

#### Scenario: Campo armazenado corretamente como array JSONB
- **WHEN** o banco retorna `notable_expenses` já como array nativo
- **THEN** o campo SHALL ser retornado sem modificação

#### Scenario: Campo nulo
- **WHEN** o banco retorna `notable_expenses` como `null`
- **THEN** o campo SHALL retornar `null` (sem tentativa de parse)

#### Scenario: String JSON inválida
- **WHEN** o banco retorna `notable_expenses` como string que não é JSON válido
- **THEN** o campo SHALL retornar `null` (parse com catch)

### Requirement: Prevenção de double-encoding na escrita
O sistema SHALL garantir que ao persistir `notable_expenses` e `structured_summary`, se o valor já for uma string, fazer `JSON.parse` antes de `JSON.stringify` para JSONB — evitando double-encoding.

#### Scenario: Modelo retorna campo como string serializada
- **WHEN** `data.notable_expenses` é uma string (ex: `"[]"`)
- **THEN** o upsert SHALL fazer parse e armazenar como JSONB nativo, não como string

#### Scenario: Modelo retorna campo como array/objeto
- **WHEN** `data.notable_expenses` é um array ou objeto nativo
- **THEN** o upsert SHALL serializar normalmente via `JSON.stringify`::jsonb
