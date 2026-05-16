## Purpose

Autenticação de tenants via email/password, com transição da SPA para estado autenticado após sucesso.

## Requirements

## ADDED Requirements

### Requirement: Formulário web de tenant login envia email e password
O cliente web SHALL enviar `POST /api/auth/login` com payload `{ email, password }`, compatível com o contrato já exigido pela API de tenant login.

#### Scenario: Submit do formulário de login no cliente web
- **WHEN** o usuário envia o formulário de login da SPA
- **THEN** a request enviada para `/api/auth/login` contém os campos `email` e `password`
- **AND** MUST NOT enviar `username` como campo principal de autenticação

### Requirement: Login bem-sucedido hidrata a sessão do cliente
Após receber `{ token }` de `POST /api/auth/login`, o cliente web SHALL persistir o token e transicionar para o estado autenticado sem exigir recarga manual.

#### Scenario: Credenciais válidas no formulário web
- **WHEN** o backend retorna `200` com `{ token }` para o formulário de login
- **THEN** o cliente salva o token
- **AND** atualiza a aplicação para o estado autenticado