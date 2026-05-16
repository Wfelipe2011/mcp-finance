## Why

O projeto tem configurações espalhadas em múltiplos lugares: `TOKEN_URL` hardcoded em `TokenHttpAdapter.ts` (IP de LAN), nomes Wilson/Giulia embutidos em `schema.sql`, e variáveis de ambiente sem um `.env.example` completo que cubra todos os serviços do compose. Qualquer pessoa que queira usar o projeto precisa caçar esses valores em lugares diferentes.

Com a chegada do serviço de auth (`auth/app`) e do login no app, o número de variáveis de ambiente vai crescer. Este é o momento certo para centralizar tudo em um único `.env.example` bem documentado.

## What Changes

- Remover o hardcode de `TOKEN_URL` em `TokenHttpAdapter.ts` — o default passa a ser `http://auth:3000/token` (nome do container no compose)
- Remover o hardcode de `192.168.0.194` do código
- Criar `.env.example` completo cobrindo todos os serviços: postgres, auth, IA, app login
- Atualizar `docker-compose.yml` para injetar `TOKEN_URL` via variável de ambiente resolvida pelo compose (não hardcode)
- Documentar cada variável com comentário inline

## Capabilities

### New Capabilities
- `env-config`: Arquivo `.env.example` canônico documentando todas as variáveis necessárias para subir o projeto completo via docker compose

### Modified Capabilities
- `token-provider`: `TOKEN_URL` passa a ser configurável via env, sem default hardcoded de IP de LAN

## Impact

- `src/infrastructure/token/TokenHttpAdapter.ts` — remoção do default `http://192.168.0.194:4567/token`
- `docker-compose.yml` — adição de variável `TOKEN_URL` no serviço `api-server`
- `.env.example` — arquivo criado/expandido com todas as variáveis
- Sem impacto em lógica de negócio ou banco de dados
