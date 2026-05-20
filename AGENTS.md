
<critical>sempre responda e gere os arquivos em pt-br</critical>

<critical>Ao usar Sub Agents deve ser modo escrita sempre usando modelo Claude Sonnet 4.6 copilot</critical>

## Desenvolvimento local

### Subir o ambiente de desenvolvimento

```bash
# Na raiz do projeto — sobe banco, API e front em um só comando
bun run dev
```

Esse comando faz as 3 coisas em sequência:
1. **Banco** → `docker compose up postgres -d` (porta 5434)
2. **API** → `bun run web:dev` (porta 3001)
3. **Client** → `bun run client:dev` (porta 5173)

`Ctrl+C` encerra os 3 processos juntos.

### Scripts individuais

| Comando | O que faz |
|---|---|
| `bun run db:up` | Sobe só o postgres via Docker |
| `bun run web:dev` | Sobe só a API (porta 3001) |
| `bun run client:dev` | Sobe só o front Vite (porta 5173) |

### Pré-requisitos

- Docker rodando
- Arquivo `.env` na raiz (copiar de `.env.example` e preencher)
- `DATABASE_URL=postgres://finance:finance@localhost:5434/finance` no `.env`


1. remove-ml-infra          → limpa infra Python morta
2. forecast-sql-views       → mantém tela Previsão viva (depende do 1)
3. migrate-to-daisyui       → base visual para tudo que criar depois
4. metas-financeiras        → primeira feature de produto
5. orcamento-categorias     → segunda feature de produto
6. relatorios-exportaveis   → terceira feature de produto
7. admin-in-app-roles       → melhora UX de administração
8. unified-priority-queue   → otimização de workers (menor urgência)