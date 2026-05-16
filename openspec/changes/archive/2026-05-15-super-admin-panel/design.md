## Context

O super admin precisa de uma interface visual para gerenciar tenants e workers. O app principal é React+Vite em `client/`. A decisão foi não tocar no bundle React — o painel é HTML+JS vanilla servido diretamente pelo Bun server na rota `GET /admin`. As APIs que o painel consome já existem (`/api/admin/login`, `/api/admin/tenants`, `/api/admin/workers`).

## Goals / Non-Goals

**Goals:**
- Página HTML autocontida em `GET /admin` — sem arquivos externos, sem build
- Login form inline que chama `POST /api/admin/login` e salva JWT no `localStorage`
- Seção Tenants: tabela (nome, email, último login, status) + form de criação + botões ativar/desativar
- Seção Workers: tabela (nome, url, status, erros) + form de criação + botões reativar/remover
- Redireciona para o form de login se não há token válido em `localStorage`

**Non-Goals:**
- Componentes React
- CSS framework externo (Tailwind, MUI) — apenas `<style>` inline básico
- switchTenant — super admin não acessa dados financeiros de tenants
- Logs detalhados de jobs ou monitoramento em tempo real
- Paginação (MVP — número de tenants/workers pequeno)

## Decisions

### D1 — HTML como template string no handler
`src/application/web/routes/admin/panel.ts` exporta função `serveAdminPanel()` que retorna `new Response(html, { headers: { 'Content-Type': 'text/html' } })` onde `html` é uma template string com o HTML+CSS+JS completo. Sem arquivo `.html` separado, sem diretório estático.

### D2 — JS vanilla com fetch — sem frameworks
Todo o comportamento (login, fetch de dados, render de tabelas, ações) é implementado em `<script>` inline usando `fetch()`, `document.createElement()` e manipulação direta do DOM. Compatível com qualquer browser moderno sem transpilação.

### D3 — Token salvo em localStorage
O super admin faz login, recebe JWT, salva em `localStorage.setItem('admin_token', token)`. Cada fetch subsequente usa `Authorization: Bearer ${token}`. Se token ausente ou 401 recebido, mostra o form de login.

### D4 — Rota GET /admin sem guard JWT no servidor
O servidor serve o HTML para qualquer request em `GET /admin` sem verificar auth — o JS na página é responsável por checar o token e mostrar o form de login. As rotas de API (`/api/admin/*`) continuam protegidas com guard JWT no servidor. Sem risco de exposição de dados.

### D5 — Forms inline na mesma página (sem rotas separadas)
Não há `/admin/tenants/new` ou similar. Cada seção tem um `<details>` ou div colapsável com o form de criação. Clique em "Novo Tenant" expande o form na mesma página.

### D6 — Estilo mínimo inline
`<style>` com reset básico, font-family system, tabela com bordas simples, botões com cores distintas (verde=ativar, vermelho=desativar/remover). Sem classes utilitárias. Funcional, não bonito.

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| Token no localStorage — XSS pode ler | Rota `/admin` só é usada pelo operador; sem input de usuário externo; risco aceitável em MVP |
| HTML inline difícil de manter | MVP — poucas funcionalidades; refatorar para arquivo separado pós-MVP se crescer |
| Sem CSRF protection no form | Rotas `/api/admin/*` exigem JWT no header — forms via `fetch()` com header são protegidos |
