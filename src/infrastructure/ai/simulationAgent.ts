import { model } from "./model.ts";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export type SimulationClassification = "viavel" | "apertado" | "inviavel";

export interface SimulationMonthInput {
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  balance: number;
}

export interface SimulationAgentResult {
  message: string;
  classification: SimulationClassification;
}

function classify(months: SimulationMonthInput[]): SimulationClassification {
  let hasNegative = false;
  let hasTight = false;

  for (const m of months) {
    if (m.balance < 0) {
      hasNegative = true;
      break;
    }
    if (m.total_income > 0 && m.balance / m.total_income < 0.1) {
      hasTight = true;
    }
  }

  if (hasNegative) return "inviavel";
  if (hasTight) return "apertado";
  return "viavel";
}

const MONTH_NAMES: Record<number, string> = {
  1: "jan", 2: "fev", 3: "mar", 4: "abr",
  5: "mai", 6: "jun", 7: "jul", 8: "ago",
  9: "set", 10: "out", 11: "nov", 12: "dez",
};

function formatMonths(months: SimulationMonthInput[]): string {
  return months
    .slice(0, 6)
    .map((m) => {
      const name = MONTH_NAMES[m.month] ?? m.month;
      const bal = m.balance.toFixed(0);
      const sign = m.balance >= 0 ? "+" : "";
      return `${name}/${m.year}: receita R$${m.total_income.toFixed(0)} despesa R$${m.total_expenses.toFixed(0)} saldo ${sign}${bal}`;
    })
    .join("\n");
}

export async function generateSimulationMessage(
  simulationName: string,
  months: SimulationMonthInput[],
): Promise<SimulationAgentResult | null> {
  const classification = classify(months);

  const classLabel =
    classification === "viavel"
      ? "viável (saldo positivo em todos os meses)"
      : classification === "apertado"
        ? "apertado (saldo abaixo de 10% da receita em algum mês)"
        : "inviável (saldo negativo em algum mês)";

  const monthsText = formatMonths(months);
  const totalMonths = months.length;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await model.invoke(
      [
        new SystemMessage(
          "Você é um consultor financeiro pessoal. Analise os dados de uma simulação financeira e gere uma mensagem curta — exatamente 2 ou 3 frases em português, tom honesto e encorajador, máximo de 300 caracteres no total. Não use markdown, não use listas, apenas texto corrido.",
        ),
        new HumanMessage(
          `Simulação: "${simulationName}" — ${totalMonths} meses projetados.\nClassificação: ${classLabel}\n\nProjeção (primeiros meses):\n${monthsText}\n\nGere a mensagem de consultor:`,
        ),
      ],
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    const raw = typeof response.content === "string"
      ? response.content
      : Array.isArray(response.content)
        ? response.content
            .filter((c) => typeof c === "object" && "text" in c)
            .map((c) => (c as { text: string }).text)
            .join("")
        : "";

    const message = raw.trim().slice(0, 300);
    return { message, classification };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
