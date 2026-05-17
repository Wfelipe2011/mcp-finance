import { createAgent, SystemMessage, HumanMessage } from "langchain";
import { model } from "./model.ts";
import { MonthlyDigestSchema, type MonthlyDigest } from "./schemas/MonthlyDigestSchema.ts";
import type { MonthInsightRow, PreviousDigestRow } from "../db/BunPgAdapter.ts";

// Agent 1: free-form analysis — no responseFormat so model responds in plain text
const agentAnalyze = createAgent({ model });

// Agent 2: structured extraction from Agent 1's analysis
const agentExtract = createAgent({
  model,
  responseFormat: MonthlyDigestSchema,
});

interface DigestInput {
  year: number;
  month: number;
  cashflow_real: number;
  debt_inflows: number;
  debt_payments: number;
  enrichment_coverage: number;
  insights: MonthInsightRow[];
  previousDigests: PreviousDigestRow[];
}

const MONTH_NAMES: Record<number, string> = {
  1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
  5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
  9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
};

export async function generateDigest(input: DigestInput): Promise<MonthlyDigest> {
  const monthName = MONTH_NAMES[input.month] ?? `mês ${input.month}`;

  const notableItems = input.insights
    .filter((r) => r.anomaly_score !== null && r.anomaly_score > 0.6)
    .sort((a, b) => (b.anomaly_score ?? 0) - (a.anomaly_score ?? 0))
    .slice(0, 10)
    .map((r) => `- ${r.description}: R$ ${Math.abs(Number(r.amount_signed)).toFixed(2)} (anomalia=${Number(r.anomaly_score).toFixed(2)}, dívida=${r.is_debt_related})`);

  const historySection = input.previousDigests.length > 0
    ? `\nHISTÓRICO RECENTE (${input.previousDigests.length} meses anteriores):\n` +
      input.previousDigests
        .map((d) => {
          const flags = d.flags?.join(", ") ?? "nenhum";
          const summary = d.narrative_pt ? d.narrative_pt.slice(0, 120) + "..." : "sem narrativa";
          return `- ${d.year}-${String(d.month).padStart(2, "0")}: cashflow=R$${Number(d.cashflow_real).toFixed(2)} | flags=[${flags}] | resumo: ${summary}`;
        })
        .join("\n")
    : "";

  // ── Agent 1: free-form financial analysis ─────────────────────────────────
  const analysisResult = await agentAnalyze.invoke({
    messages: [
      new SystemMessage(
        "Você é um analista financeiro pessoal. Analise os dados financeiros do mês e produza um relatório detalhado em português com as seguintes seções: NARRATIVA (parágrafo descritivo), ALERTAS (lista de flags relevantes como saldo_negativo, emprestimo_detectado, gastos_atipicos), DESPESAS NOTÁVEIS (transações mais relevantes com valor e motivo), RESUMO ESTRUTURADO (principais métricas em formato chave: valor). Quando houver histórico de meses anteriores, compare a evolução e destaque tendências (melhora, piora, padrão persistente)."
      ),
      new HumanMessage(
        `Analise o mês de ${monthName}/${input.year} da família.

MÉTRICAS CALCULADAS:
- Cashflow real (excluindo dívidas): R$ ${input.cashflow_real.toFixed(2)}
- Entradas de dívida (empréstimos recebidos): R$ ${input.debt_inflows.toFixed(2)}
- Pagamentos de dívida (amortizações): R$ ${input.debt_payments.toFixed(2)}
- Total de transações analisadas: ${input.insights.length}
- Cobertura de enriquecimento: ${(input.enrichment_coverage * 100).toFixed(1)}%

TRANSAÇÕES NOTÁVEIS (anomaly_score > 0.6):
${notableItems.length > 0 ? notableItems.join("\n") : "Nenhuma transação com anomalia alta detectada"}${historySection}`
      ),
    ],
  });

  const lastMsg = analysisResult.messages.at(-1);
  const analysisText = String(lastMsg?.content ?? "").trim();
  if (!analysisText) {
    throw new Error("[digestAgent] Agent 1 (análise) não retornou conteúdo. Verifique o modelo e a conexão.");
  }

  console.debug("[digestAgent] Agent 1 analysis:", analysisText.slice(0, 200) + "...");

  // ── Agent 2: structured extraction from Agent 1's analysis ────────────────
  const extractResult = await agentExtract.invoke({
    messages: [
      new SystemMessage(
        "Você é um extrator de dados estruturados. A partir do relatório financeiro abaixo, preencha os campos solicitados."
      ),
      new HumanMessage(
        `Extraia os campos estruturados do relatório financeiro abaixo:\n\n${analysisText}`
      ),
    ],
  });

  return extractResult.structuredResponse as MonthlyDigest;
}
