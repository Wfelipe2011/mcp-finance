## Context

`d_users` é uma tabela seed com `id SERIAL, name TEXT UNIQUE, display_name TEXT`. O campo `name` é `LOWER(TRIM(identities.full_name))` e é a chave de JOIN com `transactions_enriched.owner_normalized`. O `display_name` é o nome amigável exibido na UI.

As views silver e gold fazem `INNER JOIN d_users ON d_users.name = te.owner_normalized` — transações de titulares sem entrada em `d_users` são excluídas silenciosamente. Por isso o seed automático é crítico.

## Goals / Non-Goals

**Goals:**
- Seed automático de `d_users` no enrich: nomes vêm da Pluggy, sem hardcode no SQL
- `ON CONFLICT DO NOTHING` para preservar `display_name` customizado pelo usuário
- `GET /api/users` listando membros com `id`, `name`, `display_name`
- `PATCH /api/users/:id` atualizando `display_name`
- Aba "Configurações" no frontend com edição inline de display names

**Non-Goals:**
- Deletar membros (poderiam deixar transações sem JOIN)
- Adicionar membros manualmente (vêm sempre da Pluggy)
- Customizar a aba "name" (nome legal — chave de JOIN, não deve mudar)

## Decisions

### Seed no enrich — onde inserir

Dentro de `BunPgAdapter.enrichTransactions.enrich()`, logo após o `TRUNCATE` de `transactions_enriched` e antes do INSERT principal:

```sql
INSERT INTO d_users (name, display_name)
SELECT
  LOWER(TRIM(full_name)),
  initcap(split_part(full_name, ' ', 1))
FROM identities
WHERE full_name IS NOT NULL AND TRIM(full_name) != ''
ON CONFLICT (name) DO NOTHING;
```

`initcap(split_part(full_name, ' ', 1))` transforma "WILSON FELIPE DA SILVA" → "wilson..." → `initcap` → "Wilson". Funciona bem para nomes ocidentais.

### PATCH — atualizar só display_name

```sql
UPDATE d_users SET display_name = $1 WHERE id = $2
RETURNING id, name, display_name
```

Validação: `display_name` não pode ser vazio (`TRIM(display_name) != ''`). Máximo 50 chars.

### Aba Configurações no frontend

```
  Bottom navigation (atualmente 5 abas):
  Resumo | Gastos | Próx.Mês | Investimentos | Insights

  + 1 aba:
  Resumo | Gastos | Próx.Mês | Investimentos | Insights | Config
```

Como são 6 abas, o ícone vai ficar pequeno em mobile. Alternativa: ícone de configurações no header (ao lado do sync e do tema). Preferimos o ícone no header para não bagunçar o bottom nav.

```
  Header:
  💰 Finanças Familiar   [🔄]  [⚙️]  [☀️/🌙]
                          ↑     ↑
                         sync  config (abre Dialog/Drawer)
```

O `⚙️` abre um `Dialog` com:

```
  ┌────────────────────────────────────────┐
  │  ⚙️ Configurações          [✕]         │
  ├────────────────────────────────────────┤
  │  Membros                               │
  │                                        │
  │  wilson felipe da silva                │
  │  Nome exibido: [Wilson          ] [✓]  │
  │                                        │
  │  giulia cristina rodrigues de souza    │
  │  Nome exibido: [Giulia          ] [✓]  │
  │                                        │
  └────────────────────────────────────────┘
```

Edição inline com `TextField` + botão de salvar por linha. Feedback de sucesso/erro por linha.

### Sem reload após salvar display_name

`display_name` é exibido no card "Saldo em Conta" (Resumo) via `owner_normalized` que já é o nome completo. Precisaria verificar onde `display_name` aparece na UI para decidir se é necessário re-fetch após salvar.

Atualmente o `display_name` não aparece diretamente na UI do cliente (é usado nas queries do MCP/Copilot). Mas adicioná-lo futuramente seria simples. Por enquanto, salvar e fechar o dialog é suficiente.

## Risks / Trade-offs

- **initcap em nomes não-ocidentais**: nomes como "DE SOUZA" viram "De" — errado. Aceitável para uso pessoal BR onde o usuário pode corrigir via modal.
- **Identidades vazias**: se o sync ainda não rodou, `identities` está vazia e `d_users` fica vazia. Sem transações aparecem nas views. Isso já era verdade com o hardcode — a primeira vez precisa do sync. O README deve documentar isso.
- **Múltiplos itens para o mesmo titular**: a Pluggy pode retornar múltiplas `identities` com o mesmo `full_name` (um item por banco). O `ON CONFLICT DO NOTHING` + `WHERE NOT EXISTS` já trata isso corretamente.
