import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { enrichTransaction } from "../../../infrastructure/ai/enrichAgent.ts";

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

export interface EnrichPayload {
  transaction_id: string;
  date?: string;
}

export type HandlerResult =
  | { result: "done" }
  | { result: "skipped" }
  | { result: "error"; error: string };

export async function handleEnrich(
  _db: BunPgAdapter,
  tenantId: string,
  payload: EnrichPayload,
): Promise<HandlerResult> {
  const { transaction_id: transactionId } = payload;
  if (!transactionId) {
    return { result: "error", error: "payload missing transaction_id" };
  }

  const dbTenant = new BunPgAdapter(tenantId);
  try {
    const tx = await dbTenant.aiInsights.getUnenrichedById(transactionId);
    if (!tx) {
      return { result: "error", error: "transaction not found in f_transacoes" };
    }

    const insight = await enrichTransaction(tx);
    if (!insight) {
      return { result: "error", error: "AI did not return a valid structure" };
    }

    await dbTenant.aiInsights.upsertOne({
      transaction_id: transactionId,
      model_version: AI_MODEL,
      ...insight,
    });

    return { result: "done" };
  } finally {
    await dbTenant.close();
  }
}
