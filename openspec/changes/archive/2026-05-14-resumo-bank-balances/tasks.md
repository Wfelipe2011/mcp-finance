## 1. Adicionar dados de patrimônio no Resumo

- [x] 1.1 Em `client/src/tabs/Resumo.tsx`, importar `fetchPatrimonio` de `../api/client.ts` e tipo `Patrimonio` de `../api/types.ts`
- [x] 1.2 Adicionar state `const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null)`
- [x] 1.3 No `Promise.all` do `useEffect`, adicionar `fetchPatrimonio().catch(() => null)` como terceiro item e desestruturar o resultado em `setPatrimonio`

## 2. Criar card de saldo em conta

- [x] 2.1 Após o card de Receitas/Despesas em `Resumo.tsx`, adicionar um `{patrimonio && (...)}` com novo `<Paper>` intitulado "Saldo em Conta"
- [x] 2.2 No card, calcular `const contasBanco = patrimonio.items.filter(c => c.tipo === 'BANK' && (c.saldo_atual ?? 0) > 0)`
- [x] 2.3 Exibir total: `Typography h4` com `formatBRL(patrimonio.total_patrimonio)` (ou somar `contasBanco`)
- [x] 2.4 Para cada conta banco, exibir linha com: nome do banco (`c.banco`), dono (`c.dono` — primeiro nome), e valor `formatBRL(c.saldo_atual)` alinhado à direita

## 3. Validar

- [x] 3.1 Abrir aba Resumo no browser: card "Saldo em Conta" exibe Nubank (Giulia) R$1.568,58, PicPay (Wilson) R$1.600,00, Nubank (Wilson) R$33,86
- [x] 3.2 Confirmar que Bradesco (R$0) não aparece
- [x] 3.3 Confirmar que cartões de crédito não aparecem
- [x] 3.4 Rodar `bun run client:build` e confirmar zero erros TypeScript
