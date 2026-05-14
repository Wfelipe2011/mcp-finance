import { z } from "zod";

export const TransactionInsightSchema = z.object({
  merchant_name: z.string().nullable().describe("Nome real do estabelecimento (ex: Netflix, Supermercado Extra). Null se não identificado."),
  merchant_country: z.string().nullable().optional().describe("País do merchant em ISO 3166-1 alpha-2 (ex: BR, US)"),
  is_recurring: z.boolean().describe("true se parece uma assinatura ou cobrança recorrente"),
  recurrence_period: z.enum(["monthly", "annual", "unknown"]).describe("Periodicidade da recorrência; use 'unknown' se não aplicável"),
  expense_context: z.enum(["personal", "work", "shared", "debt"]).describe("Contexto do gasto"),
  is_debt_related: z.boolean().describe("true se é empréstimo recebido, amortização, ou movimentação de dívida — CRÍTICO para cashflow real"),
  anomaly_score: z.number().min(0).max(1).nullable().optional().describe("Score de anomalia de 0.0 (normal) a 1.0 (muito anômalo)"),
  tags: z.array(z.string()).describe("Tags descritivas em português (ex: ['assinatura', 'streaming', 'trabalho'])"),
  category_hint: z.string().nullable().optional().describe("Sugestão de categoria mais específica que a do banco"),
});

export type TransactionInsight = z.infer<typeof TransactionInsightSchema>;
