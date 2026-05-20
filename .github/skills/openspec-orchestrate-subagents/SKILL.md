---
name: openspec-orchestrate-subagents
description: "Use when: orquestrar changes OpenSpec com subagents, executar /opsx:apply em lote, delegar implementação ao Claude Sonnet 4.6, validar, arquivar e commitar changes até a fila acabar. Inclui tracker macro, auditoria pós-subagent, testing gate, archive sync, staging seletivo e proteção de mudanças do usuário."
argument-hint: "[change-name opcional | todas]"
---

# Orquestrar OpenSpec Com Subagents

## Quando Usar

Use esta skill quando o usuário quiser que você atue como orquestrador de uma ou mais changes OpenSpec abertas, delegando a implementação a subagents e ficando responsável por auditoria, validação, archive e commit.

Frases comuns:

- "orquestre os subagents"
- "execute as changes abertas"
- "use /opsx:apply nas changes"
- "delegue ao Claude Sonnet"
- "valide, arquive e commite"
- "repita até acabar a fila"

## Resultado Esperado

Ao final de cada change:

- implementação aplicada;
- tasks marcadas como concluídas com evidência real;
- testing gate executado;
- OpenSpec validado e arquivado;
- commit seletivo criado;
- tracker macro atualizado;
- mudanças não relacionadas do usuário preservadas.

Ao final do lote:

- `openspec list --json` não mostra changes abertas, ou o bloqueio é explicado com evidência.

## Princípios

- O subagent implementa; o orquestrador confere.
- Delegar execução não é delegar confiança.
- Nunca arquive ou commite baseado apenas no relatório do subagent.
- Nunca stageie arquivos não relacionados nem reverta alterações do usuário.
- Marque tasks como concluídas somente depois de evidência observada.
- Prefira validação focada quando o projeto tiver checks globais conhecidos como ruidosos, mas sempre execute o gate obrigatório do repositório.
- Se uma spec antiga conflitar com o estado atual do produto, alinhe a interpretação à arquitetura atual e ajuste a change antes de arquivar.

## Preparação

1. Trabalhe sempre na raiz do repositório OpenSpec.
2. Leia instruções do projeto relevantes antes de tocar arquivos.
3. Capture o estado inicial:
   - `git status --short --untracked-files=all`
   - `git log -1 --oneline`
   - `openspec list --json`
4. Identifique arquivos modificados pelo usuário e declare uma lista de preservação.
5. Crie ou atualize um tracker macro, por exemplo:
   - `openspec/ORQUESTRACAO-YYYY-MM-DD.md`

O tracker deve conter, para cada change:

- apply delegado;
- grupos de tasks executados;
- tasks concluídas;
- validação técnica;
- testing gate;
- archive;
- commit.

## Seleção Da Próxima Change

1. Rode `openspec list --json`.
2. Se o usuário definiu uma ordem, siga essa ordem.
3. Se não definiu, priorize changes por dependência e risco:
   - limpeza/infra antes de features que dependem dela;
   - base visual antes de telas novas;
   - backend/schema antes de UI dependente;
   - features de produto antes de otimizações internas, salvo bloqueio.
4. Para a change escolhida, rode:
   - `openspec status --change "<change>" --json`
   - `openspec instructions apply --change "<change>" --json`
5. Leia todos os arquivos listados em `contextFiles`, normalmente:
   - `proposal.md`
   - `design.md`
   - `tasks.md`
   - `specs/**/*.md`

## Delegação Ao Subagent

Use um subagent em modo escrita com modelo `Claude Sonnet 4.6 (copilot)`.

O prompt para o subagent deve sempre incluir:

- nome da change;
- raiz do repositório;
- arquivos OpenSpec relevantes;
- contexto técnico resumido;
- arquivos que não podem ser editados;
- proibição de archive, commit e stage;
- proibição de reverter mudanças do usuário;
- validações esperadas;
- pedido de relatório final com arquivos alterados, testes rodados, tasks pendentes e caveats.

Modelo de limites para o prompt:

```text
Critical boundaries:
- Do NOT archive the change.
- Do NOT move files under openspec/changes/archive.
- Do NOT copy specs to openspec/specs.
- Do NOT commit and DO NOT stage files.
- Preserve unrelated user changes: <lista de preservação>.
- Work from repo root only.
- Mark tasks complete only for work actually done.
```

Para tasks potencialmente destrutivas, acrescente:

```text
- Do NOT run destructive commands such as docker compose down -v, git reset, or git checkout --.
- Implement code and SQL; leave destructive or operational validation to the main orchestrator.
```

## Auditoria Pós-Subagent

Depois do relatório do subagent, não prossiga direto para archive.

Faça no mínimo:

1. `git status --short --untracked-files=all`
2. Leia arquivos novos/alterados/deletados principais.
3. Procure referências antigas ou órfãs com `rg`.
4. Confirme que arquivos preservados não foram editados pelo subagent.
5. Rode `get_errors` nos arquivos tocados quando disponível.
6. Revise o diff por módulos críticos.
7. Corrija problemas encontrados antes de validar.

Exemplos de auditoria:

```bash
rg -n "NomeAntigo|TabelaAntiga|ImportAntigo" src client || true
git diff -- <arquivos-principais>
```

## Testing Gate

Execute validações proporcionais ao risco da change.

Obrigatório neste repositório:

```bash
cd client && bun run build
```

Para backend TypeScript, prefira typecheck focado nos entrypoints tocados quando o typecheck global do repo for ruidoso:

```bash
bunx tsc --noEmit --target ESNext --module Preserve --moduleResolution bundler --allowImportingTsExtensions --verbatimModuleSyntax --strict --skipLibCheck --types bun-types <arquivos.ts>
```

Para OpenSpec:

```bash
openspec validate <change>
```

Para changes com banco:

- valide schema/tabelas/funções no Postgres local;
- use dados temporários com limpeza em `finally`;
- confirme isolamento por tenant quando aplicável;
- não deixe tenants, jobs ou simulações temporárias para trás.

Para changes com UI:

- use browser tools do VS Code;
- valide navegação, estados vazios, estados com dados e ações principais;
- se o dado local não existir, simule resposta com route interception ou crie dado temporário controlado.

## Correção De Problemas

Se a validação encontrar bug:

1. Corrija a raiz do problema.
2. Reexecute a validação que falhou.
3. Reexecute o gate obrigatório afetado.
4. Só então marque tasks como concluídas.

Se a implementação revelar que a spec está desatualizada em relação ao produto atual:

1. Ajuste `proposal.md`, `design.md`, `tasks.md` ou delta specs da change.
2. Explique a interpretação no tracker ou no resumo.
3. Rode `openspec validate <change>` novamente.

## Archive

Antes de arquivar:

1. Confirme que `tasks.md` está completo.
2. Rode:

```bash
openspec validate <change>
```

3. Arquive:

```bash
openspec archive <change> -y
```

4. Valide tudo:

```bash
openspec validate --all --strict
```

Se `openspec validate --strict` abrir prompt interativo, use `openspec validate --all --strict` para validação global não interativa.

## Commit Seletivo

Antes de stagear, rode:

```bash
git status --short --untracked-files=all
```

Stageie apenas arquivos da change. Nunca use `git add .`.

Não stageie:

- arquivos modificados pelo usuário;
- tracker local ignorado;
- diretórios OpenSpec ignorados, salvo se o usuário pediu explicitamente force-add;
- arquivos temporários de teste.

Checks antes do commit:

```bash
git diff --cached --check
git diff --cached --name-status
git diff --cached | rg -n "(AI_API_KEY|OPENROUTER|password|Authorization|Bearer|secret|token)" || true
```

Se o scan de segredos apontar apenas nomes de variáveis já existentes, confirme no diff que não há valor secreto literal.

Crie commit com mensagem curta em pt-BR:

```bash
git commit -m "<mensagem>"
```

Depois:

```bash
git status --short --untracked-files=all
git log -1 --oneline
openspec list --json
```

Atualize o tracker macro com o hash do commit.

## Loop Até Acabar

Depois de cada commit:

1. Se `openspec list --json` ainda tiver changes, escolha a próxima.
2. Repita seleção, delegação, auditoria, validação, archive e commit.
3. Se não houver changes, entregue resumo final com:
   - commits criados;
   - validações executadas;
   - worktree restante;
   - arquivos preservados;
   - riscos ou pendências operacionais.

## Critérios De Conclusão

Uma change só está concluída quando todos forem verdadeiros:

- tasks concluídas com evidência;
- validações relevantes passaram após a última alteração;
- `openspec validate <change>` passou antes do archive;
- `openspec archive <change> -y` passou;
- `openspec validate --all --strict` passou depois do archive;
- commit seletivo foi criado;
- worktree final não contém arquivos da change fora do commit;
- mudanças do usuário continuam preservadas.

## Relatório Final Sugerido

```text
Concluído: todas as changes OpenSpec abertas foram aplicadas, validadas, arquivadas e commitadas.

Commits:
- <hash> <mensagem>

Validações:
- <comando>: passou
- <teste de banco/UI>: passou

Worktree:
- Restam apenas alterações preservadas do usuário: <lista>
```