## Context

O auth service realiza login no `meu.pluggy.ai` via Puppeteer (fluxo magic link) e captura o cookie `appSession` gerado pelo Auth0. Atualmente esse cookie é retornado diretamente como `token` pelo endpoint `/token` do auth service — e o `PluggyHttpAdapter` o usa como `Authorization: Bearer`. O `my-api.pluggy.ai` rejeita esse uso com HTTP 403 porque `appSession` é um cookie de sessão para o dashboard web, não um Bearer token de API.

O token correto para `my-api.pluggy.ai` é um JWT `accessToken` obtido chamando `GET https://meu.pluggy.ai/api/access-token` com o `appSession` no header `Cookie`. Esse endpoint retorna `{ "accessToken": "eyJ..." }` no body e um novo `appSession` no `set-cookie` — renovando o ciclo automaticamente enquanto a sessão Auth0 não expirar.

O sistema atual tem TTL de 24h no cache do `appSession`, mas não controla a validade do JWT nem do novo `appSession` retornado pela troca — e o Pluggy não documenta claramente o TTL do JWT. A decisão é não depender dessas expiração externas e controlar o ciclo completo com nosso próprio TTL de 24h.

## Goals / Non-Goals

**Goals:**
- Corrigir o 403: auth service deve retornar um JWT `accessToken` válido para `my-api.pluggy.ai`
- Adicionar etapa de troca: `appSession` → `GET /api/access-token` → JWT
- Persistir `accessToken` + `appSession` renovado no cache
- TTL de 24h controlado por nós, reiniciando apenas com novo login Puppeteer
- Renovar `appSession` automaticamente a cada troca (via `set-cookie`)

**Non-Goals:**
- Não alterar o `PluggyHttpAdapter` — interface permanece a mesma
- Não implementar refresh automático do JWT sem Puppeteer (além do appSession via set-cookie)
- Não mudar o TTL configurável (hardcoded 24h é suficiente)
- Não tratar expiração absoluta do Auth0 diferente do TTL interno

## Decisions

### D1: Adicionar etapa de exchange no `BrowserAutomation` (não no service)

**Escolha**: O método `navigateToMagicLink()` retorna o `appSession` capturado; um novo método `exchangeForAccessToken(appSession)` faz a chamada HTTP para `/api/access-token` e retorna `{ accessToken, newAppSession? }`.

**Alternativas consideradas**:
- Fazer a troca diretamente no `LoginAutomationService` — possível, mas o `BrowserAutomation` já tem a lógica de interação com `meu.pluggy.ai`; a troca é outra operação no mesmo domínio
- Fazer via `fetch` direto no service — mais simples, mas cria dependência de URL no service

**Rationale**: Separar responsabilidades: `BrowserAutomation` cuida de tudo relacionado ao `meu.pluggy.ai` (com ou sem browser); o service orquestra o fluxo e persiste.

---

### D2: Cache armazena `{ appSession, accessToken, expiresAt }` com TTL de 24h nosso

**Escolha**: O `session-store` passa a guardar também o `accessToken`. O `expiresAt` é calculado como `now + 24h` no momento do login. O JWT não é inspecionado para `exp`.

**Alternativas consideradas**:
- Usar o `exp` do JWT para TTL — mais preciso, mas requer decodificar o JWT e confiar que o Pluggy mantém TTL estável
- TTL configurável via env — overcomplexidade desnecessária

**Rationale**: Controle total do ciclo de vida, sem dependência de comportamento externo não documentado.

---

### D3: `appSession` renovado via `set-cookie` é persistido automaticamente

**Escolha**: A cada chamada a `/api/access-token`, o `set-cookie` da resposta pode conter um novo `appSession`. Se presente, sobrescreve o armazenado no cache **sem reiniciar o TTL de 24h**.

**Alternativas consideradas**:
- Ignorar o `set-cookie` e usar o `appSession` original — mais simples, mas a sessão Auth0 pode expirar antes das 24h se não for renovada
- Reiniciar o TTL de 24h a cada renovação de `appSession` — amplia o risco de sessions "zumbis" funcionando por tempo indeterminado

**Rationale**: Manter o Puppeteer como gate de segurança a cada 24h; a renovação do `appSession` apenas evita que a sessão Auth0 expire prematuramente dentro desse janela.

---

### D4: Fluxo de cache hit usa `accessToken` armazenado, sem nova chamada a `/api/access-token`

**Escolha**: Se o cache (com `accessToken`) é válido (dentro do TTL de 24h), retorna o `accessToken` direto sem nenhuma chamada HTTP.

**Alternativas consideradas**:
- Sempre chamar `/api/access-token` para obter um JWT fresco (sem Puppeteer) — mais robusto contra expiração curta do JWT, mas adiciona latência a cada `/token`
- Cache com TTL menor só para o JWT (ex: 1h) dentro do TTL maior do `appSession` (24h) — overcomplexidade desnecessária sem dados claros sobre o TTL do JWT

**Rationale**: Simplicidade first. Se o JWT expirar antes do TTL de 24h (improvável dado o uso típico), o ciclo completo com Puppeteer em 24h resolveria. Pode ser revisado se o Pluggy documentar o TTL do JWT.

## Risks / Trade-offs

- **[Risk] JWT pode ter TTL menor que 24h** → Se o Pluggy emitir JWTs com TTL curto (ex: 1h), o sync falharia entre logins. Mitigação: observar os logs de 403 após o deploy — se ocorrerem, adicionar cache secundário só para o JWT. Por ora, aceito como risco baixo.

- **[Risk] `appSession` Auth0 expirar antes de 24h por inatividade** → O Auth0 pode ter sessão com idle timeout. Mitigação: a chamada a `/api/access-token` já funciona como "keep-alive" de sessão — renovar o `appSession` via `set-cookie` previne isso enquanto o sistema está ativo.

- **[Risk] `set-cookie` de renovação ausente em alguma chamada** → Se o endpoint não devolver `set-cookie`, o `appSession` original é mantido sem reiniciar o TTL de 24h. Aceitável — o pior caso é o Puppeteer reautenticar no próximo ciclo.

- **[Trade-off] Sem renovação automática sem Puppeteer** → Diferente de uma API key, a sessão não se renova indefinidamente sem interação. A cada 24h (ou se o `appSession` expirar antes), o Puppeteer deve navegar novamente. Isso é uma limitação arquitetural do Pluggy (magic link + Auth0), não uma escolha nossa.

## Migration Plan

1. Fazer as mudanças no código (sem mudar a interface do endpoint `/token`)
2. Apagar o `sessions.json` atual (contém apenas `appSession`, sem `accessToken`)
3. Rebuild + restart do container `auth`
4. Primeiro request ao `/token` dispara Puppeteer → magic link → exchange → JWT
5. Sync subsequente usa o JWT do cache

**Rollback**: Reverter os arquivos modificados + apagar `sessions.json` + rebuild. O `PluggyHttpAdapter` não muda, então não há rollback no lado do api-server.

## Open Questions

- Qual é o TTL real do JWT emitido por `/api/access-token`? (decodificar o `exp` do JWT obtido em produção para observação)
- O `set-cookie` de renovação do `appSession` sempre está presente, ou apenas em algumas chamadas?
