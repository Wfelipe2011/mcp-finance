---
name: webchat-task-6-chatwidget-fix
description: Corrige erros de TypeScript no ChatWidget.tsx substituindo Fab e ícones MUI não disponíveis por alternativas compatíveis com a versão instalada.
---

Você é um agente de correção de build para o projeto `c:\workspace\lab\mcp-finance`.

## Problema

O build do frontend falha com estes erros em `client/src/components/ChatWidget.tsx`:

1. `Module '"@mui/material"' has no exported member 'Fab'` — Fab não existe na versão instalada
2. `Cannot find module '@mui/icons-material/ChatRounded'` — ícone não existe na versão instalada
3. `Cannot find module '@mui/icons-material/SendRounded'` — ícone não existe na versão instalada
4. `Property 'multiline' does not exist` no TextField
5. `Type 'string' is not assignable to type 'number'` (provavelmente maxRows)

## Contexto

- `@mui/material` está disponível via dependência transitiva (não está no package.json direto)
- A versão instalada NÃO tem `Fab`, NÃO tem `ChatRounded`, NÃO tem `SendRounded`
- A versão POSSUI: `Box`, `Paper`, `Typography`, `TextField`, `IconButton`, `CircularProgress`
- `CloseRoundedIcon` de `@mui/icons-material/CloseRounded` FUNCIONA (veja ConfigDialog.tsx)
- O projeto usa `tailwindcss` no frontend — pode usar classes Tailwind como alternativa

## Sua missão — corrigir `client/src/components/ChatWidget.tsx`

### Fix 1 — Substituir `Fab`

Remova o `Fab` e substitua por um botão flutuante usando `IconButton` do MUI com sx de posicionamento fixo:

```tsx
<IconButton
  color="primary"
  aria-label={open ? "Fechar chat" : "Abrir chat"}
  onClick={handleToggle}
  sx={{
    position: "fixed",
    bottom: 16,
    right: 16,
    zIndex: 1201,
    bgcolor: "primary.main",
    color: "primary.contrastText",
    width: 56,
    height: 56,
    borderRadius: "50%",
    "&:hover": { bgcolor: "primary.dark" },
    boxShadow: 3,
  }}
>
  {open ? <CloseRoundedIcon /> : "💬"}
</IconButton>
```

### Fix 2 — Substituir ícones não disponíveis

- `ChatRoundedIcon` → use o caractere `"💬"` (emoji) dentro de um `<span>` ou diretamente no JSX
- `SendRoundedIcon` → use o caractere `"➤"` ou `"→"` ou `"▶"` dentro de um `<span>`
- `CloseRoundedIcon` — MANTER (funciona, já está no projeto em ConfigDialog.tsx)

### Fix 3 — Corrigir props do TextField

O `TextField` dessa versão pode ter problemas com `multiline`. Substitua por um `textarea` nativo com sx ou simplesmente use um TextField simples sem `multiline`/`maxRows`:

```tsx
<TextField
  fullWidth
  size="small"
  placeholder="Digite sua pergunta..."
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  disabled={loading}
  variant={"outlined" as const}
  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
/>
```

Se `variant` ainda causar erro, passe sem o variant (usa o default "outlined").

## Processo

1. Leia `client/src/components/ChatWidget.tsx`
2. Aplique os 3 fixes acima
3. Execute o typecheck para confirmar: `docker run --rm -v "C:/workspace/lab/mcp-finance/client:/app" -w /app oven/bun:latest sh -c "bun install --frozen-lockfile && bunx tsc --noEmit"`
4. Se ainda houver erros, corrija-os iterativamente
5. Confirme build limpo

## Restrições

- NÃO instale novos pacotes de ícones
- NÃO troque para Tailwind puro — mantenha a estrutura com MUI (Box, Paper, Typography etc.)
- A funcionalidade do widget deve ser preservada integralmente
- `CloseRoundedIcon` pode continuar sendo usado
