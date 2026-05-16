## Why

O README atual é o boilerplate gerado pelo `bun init` — descreve como rodar um projeto Bun genérico, não este projeto. Quem clonar o repo hoje não sabe o que é o projeto, como configurar, nem como subir. Com todas as mudanças de infra (compose completo, auth, login), o README precisa refletir a realidade: **clonar + configurar .env + docker compose up = painel funcionando**.

## What Changes

- Reescrever o `README.md` com foco em "fork e uso em 3 passos"
- Documentar cada variável do `.env.example` com propósito e onde obter
- Explicar o fluxo completo: Pluggy → sync → dashboard
- Seção de pré-requisitos clara (conta Pluggy, Gmail com App Password, Docker)
- Seção de arquitetura resumida para quem quiser entender o que sobe

## Capabilities

### New Capabilities
- `fork-guide`: README orientado ao usuário final que quer usar o projeto sem entender o código interno

## Impact

- `README.md` — reescrita completa
- Sem impacto em código
