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

export interface DailyInsightContext {
  insight_type: string;
  category_pt: string;
  group_pt: string;
  occurrences: number;
  avg_amount: number;
  probability: number;
  suggested_action_type: string;
  day_of_week?: number;
  occurrences_6m?: number;
}

const CATEGORY_ACTION_MAP: Record<string, string> = {
  'Delivery de comida': 'cook_at_home',
  'Restaurantes': 'plan_meals_ahead',
  'Alimentação e bebidas': 'meal_prep',
  'Mercado e supermercado': 'check_pantry_first',
  'Táxi e aplicativos': 'use_public_transport',
  'Postos de combustível': 'plan_trips',
  'Transporte': 'use_public_transport',
  'Compras': 'compare_prices',
  'Compras online': 'wait_24h_before_buying',
  'Bem-estar e fitness': 'check_subscription',
  'Streaming de vídeo': 'audit_subscriptions',
  'Serviços digitais': 'audit_subscriptions',
  'Viagem': 'book_in_advance',
  'Hospedagem': 'book_in_advance',
};

function getSuggestedAction(category: string): string {
  return CATEGORY_ACTION_MAP[category] ?? 'review_spending';
}

export { getSuggestedAction };

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

export async function generateDailyInsightMessage(context: DailyInsightContext): Promise<string> {
  const contextStr = JSON.stringify({
    insight_type: context.insight_type,
    category_pt: context.category_pt,
    group_pt: context.group_pt,
    occurrences: context.occurrences,
    avg_amount: context.avg_amount.toFixed(2),
    probability: (context.probability * 100).toFixed(0) + '%',
    suggested_action_type: context.suggested_action_type,
    occurrences_6m: context.occurrences_6m,
  });

  const result = await agent.invoke({
    messages: [
      new SystemMessage(
        `You are a personal finance advisor specialized in Brazilian household spending patterns. You apply behavioral economics to give short, actionable guidance.

Rules:
- Identify the specific category and reference its average amount (R$)
- Connect the pattern to day-of-week or frequency when relevant
- Suggest ONE concrete action the user can take today
- Tone: direct, non-judgmental, specific

ALWAYS respond in Brazilian Portuguese (pt-BR).
MAXIMUM 2 sentences. NO greetings or sign-offs.`
      ),
      new HumanMessage(
        `Spending pattern identified for today:\n${contextStr}\n\nGenerate a personalized observation and one concrete action for the user.`
      ),
    ],
  });

  const lastMsg = result.messages.at(-1);
  const text = String(lastMsg?.content ?? "").trim();
  if (!text) {
    throw new Error("[forecastAgent] generateDailyInsightMessage: LLM não retornou conteúdo");
  }
  return text;
}
