## Why

A aba Resumo exibe apenas o cashflow do mês e o fôlego financeiro (R$0.3 meses), mas não mostra o **saldo real em conta**. O usuário não tem conforto visual de saber quantos reais há em cada banco agora. O endpoint `/api/patrimonio` já existe com todos os dados necessários — é só expô-los.

## What Changes

- Adicionar um card "Saldo em Conta" na aba Resumo, exibindo saldo atual por banco (somente contas tipo `BANK`, excluindo crédito)
- O card deve mostrar: total em conta, e breakdown por banco (Nubank, PicPay, Bradesco, etc.)
- Reutilizar os dados de `/api/patrimonio` que já existem (sem nova API)

## Capabilities

### New Capabilities

- `resumo-saldo-contas`: Exibição do saldo atual por conta bancária na aba Resumo, como card separado após o card de receitas/despesas

### Modified Capabilities

*(nenhuma)*

## Impact

- `client/src/tabs/Resumo.tsx`: novo card de saldo em conta
- `client/src/api/client.ts`: reutilizar `fetchPatrimonio()` (já existe)
- `client/src/api/types.ts`: reutilizar `Patrimonio` e `PatrimonioItem` (já existem)
- Sem mudanças no backend
