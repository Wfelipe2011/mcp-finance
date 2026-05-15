import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { TokenHttpAdapter } from "../../../infrastructure/token/TokenHttpAdapter.ts";
import { SyncUseCase } from "../../sync/SyncUseCase.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

export async function handleSync(_req: Request, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  try {
    const tokenPort = new TokenHttpAdapter(tenantId);
    const useCase = new SyncUseCase({
      tokenPort,
      itemRepo: db.items,
      accountRepo: db.accounts,
      transactionRepo: db.transactions,
      investmentRepo: db.investments,
      investmentTransactionRepo: db.investmentTransactions,
      enrichTransactionRepo: db.enrichTransactions,
    });
    const summary = await useCase.run();
    return jsonResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  } finally {
    await db.close();
  }
}
