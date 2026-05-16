## 1. Atualizar TokenHttpAdapter

- [x] 1.1 Em `src/infrastructure/token/TokenHttpAdapter.ts`, trocar o default `http://192.168.0.194:4567/token` por `http://auth:3000/token`

## 2. Criar .env.example completo

- [x] 2.1 Criar/substituir `.env.example` na raiz com todos os grupos de variáveis documentados: postgres, pluggy, IA, app login
- [x] 2.2 Garantir que cada variável tem comentário explicativo e, onde aplicável, instrução de onde obter o valor

## 3. Atualizar docker-compose.yml

- [x] 3.1 No serviço `api-server`, adicionar `TOKEN_URL: http://auth:3000/token` no bloco `environment` (garante override mesmo se o usuário definir outro valor no .env)
- [x] 3.2 Verificar que nenhuma outra variável de conexão entre containers vaza para o `.env` do usuário

## 4. Validar

- [x] 4.1 Rodar `bun run client:build` e confirmar zero erros TypeScript
- [x] 4.2 Confirmar que `TOKEN_URL` está em `process.env["TOKEN_URL"]` no adapter sem nenhum string de IP no código
