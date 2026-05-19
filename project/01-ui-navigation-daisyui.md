# Contexto 01 — Navegação + DaisyUI + Responsive (Mobile-first → PC)

## Objetivo desta rodada de explore

Redesenhar a navegação do app para:
- Substituir `BottomNavigation` do MUI por componentes **DaisyUI** puros (Dock + Drawer + Tabs)
- Adicionar suporte a desktop com **breakpoints Tailwind** sem quebrar mobile
- Criar tela **Treinar** como rota própria no menu (não mais sub-aba)
- Consolidar sub-abas da tela IA com DaisyUI **Tabs**
- Eliminar duplicação Insights / IA

---

## Problema atual

```
Bottom Nav MUI hoje (6 itens):
┌─────────┬────────┬───────────┬──────────────┬──────────┬──────┐
│ Resumo  │ Gastos │ Próx. Mês │ Investimentos│ Insights │  IA  │
└─────────┴────────┴───────────┴──────────────┴──────────┴──────┘
                                                    ↑         ↑
                                              duplicado   [sub-abas]
                                                          Insights ← duplicado!
                                                          Previsões
                                                          Treinar

Problemas:
- MUI BottomNavigation: pesado, inconsistente com Tailwind/DaisyUI
- Sem adaptação para desktop (não usa breakpoints)
- "Insights" existe como aba E como sub-aba dentro de IA
- "Treinar" enterrado em sub-aba difícil de achar
- 6 itens no bottom nav é muito — limite ideal é 5
```

---

## Proposta a explorar

### Navegação mobile (< 1024px) → DaisyUI Dock
```
✅ DECISÃO: 5 itens, sem Treinar (ML removido), Investimentos permanece no Dock

┌──────────────────────────────────────────────┐
│                conteúdo da tela              │
│                                              │
├──────┬───────┬──────┬───────────┬────────────┤
│Resumo│Gastos │Próx. │Investim.  │    IA      │
│ 🏠   │  💸   │ 📅   │   📈      │    🤖      │
└──────┴───────┴──────┴───────────┴────────────┘

IA tem sub-abas internas (DaisyUI Tabs): [ Insights ] [ Previsões ]
Admin aparece apenas para role admin (troca IA ou adiciona item 6 — decidir em contexto 03)
```

### Navegação desktop (≥ 1024px) → DaisyUI Drawer lateral
```
┌────────────┬─────────────────────────────┐
│  Sidebar   │                             │
│ ─────────  │   Conteúdo da tela ativa    │
│  🏠 Resumo │                             │
│  💸 Gastos │   • Espaço para exibir      │
│  📅 Próx.  │     mais dados lado a lado  │
│  📈 Invest │   • Charts maiores          │
│  🤖 IA     │   • Tabelas com mais colunas│
│            │                             │
│  ─────────  │                             │
│  ⚙️ Config  │                             │
└────────────┴─────────────────────────────┘
```

### Sub-abas dentro de "IA" → DaisyUI Tabs
```
[ Insights ] [ Previsões ]
```
✅ DECISÃO: Treinar removido do menu — sem ML, não há treinamento de modelo

---

## Decisões tomadas

1. ✅ **Investimentos**: fica no Dock como item próprio (5 itens total)
2. **DaisyUI Drawer vs Navbar** para desktop: o Drawer com `lg:drawer-open` — PENDENTE: confirmar se sidebar fixa ou toggle
3. ✅ **Tela Treinar**: REMOVIDA — sem ML, sem treinamento de modelo
4. **Migração de MUI**: verificar quais outros componentes MUI são usados — PENDENTE investigação

## Questões ainda em aberto

1. **DaisyUI Drawer**: sidebar sempre visível no desktop ou com toggle? (Drawer `lg:drawer-open` vs Navbar horizontal)
2. **Outros componentes MUI**: além do BottomNavigation, o app usa Dialog, TextField, **ChatWidget** (Paper, IconButton, CircularProgress), etc. → migrar tudo de uma vez ou só a nav?
3. **Nome da última aba**: "IA" hoje. Contexto 11 propõe renomear para "Insights" ou "Conversar" — decidir junto com este contexto.
4. **ChatWidget**: balão flutuante (mantém) OU vira aba inteira (Opção B do ctx 11)?

---

## Arquivos-chave para a change

| Arquivo | Papel |
|---|---|
| `client/src/App.tsx` | Monta navegação, define tabs ativas |
| `client/src/index.css` | Imports Tailwind + configuração DaisyUI |
| `client/tailwind.config.ts` | Breakpoints, tema |
| `client/src/tabs/IaScreen.tsx` | Tela IA com sub-abas (Insights + Previsões) |
| `client/src/tabs/Treinar.tsx` | Mover para tela própria no menu |
| `client/src/tabs/Insights.tsx` | Possível remoção (merge com IaScreen) |
| `client/src/tabs/Resumo.tsx` | Home — possível inclusão de seção Investimentos |
| `client/src/tabs/Investimentos.tsx` | Verificar se vira sub-aba ou permanece |
| `client/package.json` | Adicionar daisyui, remover @mui se possível |

---

## Referências

- **DaisyUI Dock** (bottom nav): https://daisyui.com/components/dock/
- **DaisyUI Drawer** (sidebar desktop): https://daisyui.com/components/drawer/
- **DaisyUI Tabs**: https://daisyui.com/components/tab/
- **DaisyUI Navbar**: https://daisyui.com/components/navbar/
- **DaisyUI Menu**: https://daisyui.com/components/menu/
- **Tailwind Responsive**: https://tailwindcss.com/docs/responsive-design
- **Tailwind Container Queries**: https://tailwindcss.com/docs/responsive-design#container-queries
  - Útil para cards que precisam adaptar layout baseado no container, não na viewport
- **DaisyUI Install**: https://daisyui.com/docs/install/

### Breakpoints Tailwind relevantes
| Prefix | Width | Uso neste contexto |
|---|---|---|
| (nenhum) | 0px+ | Mobile first — Dock bottom |
| `md:` | 768px+ | Tablet — possível ajuste de grid |
| `lg:` | 1024px+ | Desktop — Drawer lateral `lg:drawer-open` |

### Padrão DaisyUI para Drawer responsivo
```html
<!-- Mobile: drawer fechado por padrão | Desktop: lg:drawer-open -->
<div class="drawer lg:drawer-open">
  <input id="drawer" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content"><!-- página --></div>
  <div class="drawer-side">
    <label for="drawer" class="drawer-overlay"></label>
    <ul class="menu ..."><!-- nav items --></ul>
  </div>
</div>
```

---

## Sugestão de escopo para a change

**Uma change pequena e focada:**
1. Instalar DaisyUI no projeto client
2. Substituir `BottomNavigation` MUI por `dock` DaisyUI no mobile
3. Adicionar drawer lateral para `lg:` com os mesmos itens
4. Mover "Treinar" para item do menu (5 itens finais a definir)
5. Remover `BottomNavigation`, `BottomNavigationAction` do MUI (se não usado em outro lugar)

**Deixar para change seguinte:**
- Redesign das sub-abas dentro de IA
- Merge/remoção da aba Insights duplicada
- Adaptações de layout dos conteúdos para desktop
