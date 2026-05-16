## Why

O app web pode entrar em ciclo de recarga na rota `/` quando existe `selectedMonth` persistido, mas não há `authToken` válido: o cliente dispara `GET /api/digest`, recebe `401`, apaga o token e força `reload()`. Em paralelo, a tela de login envia `{ username, password }`, enquanto a API aceita apenas `{ email, password }`, impedindo a recuperação do estado pelo próprio formulário.

## What Changes

- Corrigir o contrato do formulário de login para enviar os campos aceitos por `POST /api/auth/login`.
- Proteger o bootstrap do app para que chamadas autenticadas só ocorram quando houver token válido.
- Ajustar o tratamento de `401` no cliente para evitar recarga infinita da SPA quando a sessão estiver ausente ou inválida.
- Manter o endpoint `/api/digest` protegido; o problema é a ordem das chamadas do cliente, não a política de autenticação do backend.

## Capabilities

### New Capabilities
- `web-auth-bootstrap`: fluxo do cliente para login, bootstrap autenticado e tratamento de sessão expirada sem loop de recarga.

### Modified Capabilities
- `tenant-login`: o cliente web deve respeitar o contrato existente de login por `email` e `password`.

## Impact

- `client/src/components/LoginScreen.tsx`
- `client/src/App.tsx`
- `client/src/api/client.ts`
- `openspec/specs/tenant-login/spec.md`
- novo spec em `openspec/specs/web-auth-bootstrap/spec.md`