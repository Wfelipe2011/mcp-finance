## 1. Handler do painel HTML

- [x] 1.1 Criar `src/application/web/routes/admin/panel.ts` com função `serveAdminPanel()` que retorna `new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })`. O `html` é uma template string com todo o conteúdo inline.
- [x] 1.2 Implementar o HTML com: `<style>` básico (reset, tabela, botões), `<div id="login-section">` com form de login, `<div id="data-section" hidden>` com seções de tenants e workers.
- [x] 1.3 Implementar o `<script>` inline com: verificação de token em `localStorage` ao carregar; fetch de login e salvamento do token; fetch e render das tabelas de tenants e workers; handlers de criação, ativar/desativar e remover.

## 2. Rota GET /admin no router

- [x] 2.1 Adicionar rota `GET /admin` no `router.ts` (sem guard JWT): delega para `serveAdminPanel()`.

## 3. Seção Tenants

- [x] 3.1 Implementar tabela de tenants no HTML: colunas Nome, Email, Último Login, Status + coluna de ações.
- [x] 3.2 Implementar form colapsável "Novo Tenant" com campos: name, email, password, pluggy_email, pluggy_password; submit chama `POST /api/admin/tenants` e atualiza tabela em caso de sucesso.
- [x] 3.3 Implementar botão ativar/desativar por linha: chama `PATCH /api/admin/tenants/:id` e atualiza o status na linha sem recarregar.

## 4. Seção Workers

- [x] 4.1 Implementar tabela de workers no HTML: colunas Nome, URL, Status, Erros + coluna de ações.
- [x] 4.2 Implementar form colapsável "Novo Worker" com campos: name, ai_base_url, ai_api_key, ai_model; submit chama `POST /api/admin/workers` e atualiza tabela.
- [x] 4.3 Implementar botão Reativar (visível quando status=inactive/error): chama `PATCH /api/admin/workers/:id { status: "active" }`.
- [x] 4.4 Implementar botão Remover por linha: chama `DELETE /api/admin/workers/:id` e remove a linha da tabela.

## 5. Verificação

- [x] 5.1 Acessar `GET /admin` sem token: verificar que apenas o form de login aparece.
- [x] 5.2 Fazer login com credenciais corretas: verificar que token é salvo e dados aparecem.
- [x] 5.3 Fazer login com credenciais erradas: verificar mensagem de erro inline.
- [x] 5.4 Criar um tenant via painel: verificar que aparece na tabela sem recarregar.
- [x] 5.5 Desativar um tenant: verificar que o status muda na linha.
- [x] 5.6 Criar e remover um worker via painel: verificar comportamento correto.
