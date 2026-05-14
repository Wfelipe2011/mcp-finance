import { createAgent, SystemMessage, HumanMessage } from "langchain";
import { model } from "./model.ts";
import { TransactionInsightSchema, type TransactionInsight } from "./schemas/TransactionInsightSchema.ts";
import type { UnenrichedTransaction } from "../db/BunPgAdapter.ts";

const agentExtract = createAgent({
  model,
  responseFormat: TransactionInsightSchema,
});

export async function enrichTransaction(tx: UnenrichedTransaction): Promise<TransactionInsight | undefined> {
  const result = await agentExtract.invoke({
    messages: [
      new SystemMessage(`You are a financial data extraction assistant. Extract structured fields from the transaction below.

Rules:
- is_debt_related=true: received loans, loan deposits, amortizations, debt payments, financing
- is_debt_related=false: regular expenses, salary, normal operational income
- recurrence_period='unknown' if the transaction is not recurring
- expense_context: 'personal' for personal expenses, 'work' for business, 'shared' for household, 'debt' for debt-related`),
      new HumanMessage(
        `Extract transaction insight fields from:
- Description: ${tx.description}
- Amount: R$ ${Math.abs(tx.amount_signed).toFixed(2)} (${tx.amount_signed >= 0 ? "credit/income" : "debit/expense"})
- Kind: ${tx.transaction_kind}
- Category: ${tx.category_pt ?? "uncategorized"}
- Group: ${tx.category_group_pt ?? "uncategorized"}`
      ),
    ],
  });

  console.debug("[enrichAgent] structuredResponse:", JSON.stringify(result.structuredResponse));
  return result.structuredResponse as TransactionInsight | undefined;
}