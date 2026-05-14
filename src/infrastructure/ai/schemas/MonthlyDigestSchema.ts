import { z } from "zod";

export const MonthlyDigestSchema = z.object({
  narrative_pt: z.string().describe("Parágrafo narrativo em português descrevendo o mês financeiro"),
  structured_summary: z.record(z.string(), z.unknown()).describe("Resumo estruturado em JSON para consumo por agente LLM"),
  flags: z.array(z.string()).describe("Flags do mês (ex: ['emprestimo_detectado', 'gastos_atipicos', 'saldo_negativo'])"),
  notable_expenses: z.array(
    z.object({
      description: z.string(),
      amount: z.number(),
      reason: z.string().describe("Por que esta transação é notável"),
    })
  ).describe("Transações mais notáveis ou anômalas do mês"),
});

export type MonthlyDigest = z.infer<typeof MonthlyDigestSchema>;
