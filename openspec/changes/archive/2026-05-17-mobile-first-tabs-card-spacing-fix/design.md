## Context

O client já opera com navegação inferior fixa e múltiplas abas com cards e gráficos. Na validação visual recente, foram observadas regressões de layout em mobile: sobreposição da tabbar sobre conteúdo no fim da página, densidade excessiva por falta de padding consistente em cards e redução de legibilidade em labels/eixos/tabelas quando a viewport é estreita.

Restrições relevantes:
- O projeto deve seguir mobile-first como prioridade de layout.
- A tabbar inferior deve permanecer fixa.
- As telas precisam manter legibilidade de dados financeiros (valores BRL, labels e tabelas) sem recortes.

Stakeholders:
- Usuário final (uso diário em mobile)
- Frontend (manutenção de consistência visual)
- QA (regressão visual por navegação)

## Goals / Non-Goals

**Goals:**
- Garantir layout mobile-first em todas as abas principais.
- Manter tabbar fixa sem cobrir conteúdo rolável.
- Definir baseline de espaçamento interno dos cards e blocos informacionais.
- Preservar legibilidade dos componentes de dados em viewport reduzida.
- Padronizar critérios de validação visual para prevenir regressão.

**Non-Goals:**
- Alterar regras de negócio de endpoints ou cálculo financeiro.
- Reescrever o design system completo.
- Mudar contratos de API backend.

## Decisions

### D1. Safe-area obrigatório para conteúdo com tabbar fixa
**Decisão:** toda área rolável das abas terá padding-bottom mínimo baseado em altura da tabbar + margem de segurança.

**Racional:** elimina a sobreposição visual no fim de listas, tabelas e gráficos mantendo a tabbar fixa.

**Alternativas consideradas:**
- Remover tabbar fixa: rejeitado por conflito com requisito do produto.
- Reduzir altura da tabbar sem safe-area: insuficiente para listas longas.

### D2. Escala única de spacing interno para cards
**Decisão:** padronizar padding e gap internos em tokens (mínimo vertical/horizontal) e aplicar em cards de todas as abas.

**Racional:** resolve inconsistência de densidade visual e melhora escaneabilidade em mobile.

**Alternativas consideradas:**
- Ajuste manual por tela: alto risco de divergência futura.
- Ajuste apenas nos cards críticos: não resolve a percepção geral de aperto.

### D3. Guardrails de legibilidade para data-viz em viewport estreita
**Decisão:** aplicar regras de fallback para labels longas (truncamento/abreviação), largura mínima de áreas de gráfico e overflow controlado quando necessário.

**Racional:** evita colisão de texto e perda de contexto em gráficos/tabelas no mobile.

**Alternativas consideradas:**
- Reduzir fonte globalmente: piora leitura de valores financeiros.
- Ocultar labels em mobile: reduz compreensão do dado.

### D4. Validação visual por fluxo de navegação completo
**Decisão:** o gate visual deve incluir navegação pelas 6 abas e captura de evidência em pontos de maior risco (fim de scroll em cards/tabela).

**Racional:** os defeitos observados aparecem durante uso real de navegação e scroll, não só no first paint.

## Risks / Trade-offs

- [Risco] Aumento de whitespace em desktop após ajuste mobile-first.
  → Mitigação: usar breakpoints progressivos para densidade maior apenas em telas amplas.

- [Risco] Mudanças de spacing afetarem snapshots visuais e testes frágeis.
  → Mitigação: validar por papéis/texto e revisar snapshots necessários.

- [Risco] Ajustes de gráficos introduzirem overflow horizontal indesejado.
  → Mitigação: combinar width responsiva, abreviação de labels e validação em múltiplos pontos de scroll.

## Migration Plan

1. Aplicar contrato mobile-first no shell e containers de abas.
2. Implementar safe-area inferior em todas as páginas com conteúdo rolável.
3. Padronizar spacing interno dos cards e blocos de resumo.
4. Ajustar legibilidade de gráficos/tabelas para viewport estreita.
5. Executar validação visual completa por navegação e scroll.

Rollback:
- Reversão por lote (shell/safe-area, cards, gráficos) com validação após cada rollback.

## Open Questions

- A altura final da tabbar fixa deve variar por breakpoint ou permanecer constante?
- Quais labels de gráficos podem ser abreviadas sem perda de entendimento para o usuário?
- Existe necessidade de safe-area adicional para dispositivos com barras do sistema mais altas?
