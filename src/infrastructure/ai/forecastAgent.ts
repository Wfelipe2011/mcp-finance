import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { model } from "./model.ts";
import type { PredictionByGroup, SpendingByGroup } from "../db/BunPgAdapter.ts";

const agent = createAgent({ model });

const MONTH_NAMES: Record<number, string> = {
  1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
  5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
  9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
};

export interface ForecastMessageContext {
  currentYear: number;
  currentMonth: number;
  spending: SpendingByGroup[];
  predictions: PredictionByGroup[];
}

export async function generateForecastMessage(ctx: ForecastMessageContext): Promise<string> {
  const monthName = MONTH_NAMES[ctx.currentMonth] ?? `mês ${ctx.currentMonth}`;

  const spendingLines = ctx.spending
    .map((s) => `  - ${s.group_pt}: R$ ${s.total_gastos.toFixed(2)}`)
    .join("\n");

  // Group predictions by month
  const predByMonth = new Map<string, PredictionByGroup[]>();
  for (const p of ctx.predictions) {
    const key = `${p.target_year}-${String(p.target_month).padStart(2, "0")}`;
    const arr = predByMonth.get(key) ?? [];
    arr.push(p);
    predByMonth.set(key, arr);
  }

  const predLines = Array.from(predByMonth.entries())
    .map(([ym, preds]) => {
      const month = MONTH_NAMES[Number(ym.split("-")[1])] ?? ym;
      const lines = preds.map((p) => `    - ${p.group_pt}: R$ ${p.predicted_total.toFixed(2)}`).join("\n");
      return `  ${month}:\n${lines}`;
    })
    .join("\n");

  const result = await agent.invoke({
    messages: [
      new SystemMessage(
        "Você é um consultor financeiro pessoal conciso. Responda SEMPRE em português, com no máximo 2 frases. Seja direto, específico e acionável. Não use saudações nem conclusões. Baseie-se nos dados fornecidos."
      ),
      new HumanMessage(
        `Dados financeiros de ${monthName}/${ctx.currentYear}:

GASTOS REAIS DO MÊS ATUAL por grupo:
${spendingLines || "  (sem dados)"}

PREDIÇÕES PARA OS PRÓXIMOS 3 MESES por grupo:
${predLines || "  (sem predições)"}

Com base nesses dados, dê uma observação concreta e uma ação recomendada para a família controlar melhor as finanças.`
      ),
    ],
  });

  const lastMsg = result.messages.at(-1);
  const text = String(lastMsg?.content ?? "").trim();
  if (!text) {
    throw new Error("[forecastAgent] LLM não retornou conteúdo");
  }
  return text;
}
