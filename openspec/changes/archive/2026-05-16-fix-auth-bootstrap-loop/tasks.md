## 1. Login Contract

- [x] 1.1 Atualizar `client/src/components/LoginScreen.tsx` para enviar `{ email, password }` a `POST /api/auth/login`
- [x] 1.2 Ajustar o formulário para refletir semanticamente email como credencial principal (campo/label/mensagem, se necessário)

## 2. Auth Bootstrap Guard

- [x] 2.1 Atualizar `client/src/App.tsx` para que efeitos autenticados dependam de `authToken` válido antes de disparar `fetchDigest` ou outras chamadas protegidas
- [x] 2.2 Garantir que `selectedMonth` persistido não dispare requests protegidos enquanto a UI estiver no estado de login

## 3. 401 Handling

- [x] 3.1 Revisar `client/src/api/client.ts` para invalidar a sessão sem usar `window.location.reload()` em loop quando houver `401`
- [x] 3.2 Verificar os fluxos de `get()`, `triggerSync()` e `updateUserDisplayName()` para manter comportamento consistente ao expirar sessão

## 4. Validation

- [x] 4.1 Validar no browser limpo que `/` permanece estável na tela de login quando não há token salvo
- [x] 4.2 Validar login bem-sucedido via formulário web e confirmar que `GET /api/digest` só roda após autenticação
- [x] 4.3 Rodar `cd client && bun run build` para confirmar TypeScript sem erros