import type { SQL } from "bun";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolError, toolSuccess } from "../common/errors.ts";
import { validateTenant } from "../common/db.ts";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { TokenHttpAdapter } from "../../../infrastructure/token/TokenHttpAdapter.ts";
import { SyncUseCase } from "../../sync/SyncUseCase.ts";

export function registerSyncTool(server: McpServer, sql: SQL): void {
  server.tool(
    "sync",
    "Trigger a data synchronization for a tenant — fetches updated transactions, accounts and investments from the upstream financial provider and queues enrichment jobs. Returns a summary with item/account/transaction counts and number of enrichment jobs queued.",
    {
      tenant_id: z.string().describe("Tenant UUID — required to scope the sync operation"),
    },
    async ({ tenant_id }) => {
      const tenantErr = await validateTenant(sql, tenant_id);
      if (tenantErr) return toolError(tenantErr);

      try {
        const db = new BunPgAdapter(tenant_id, sql);
        const tokenPort = new TokenHttpAdapter(tenant_id);
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
        let enrichQueued = 0;
        for (const txId of summary.transactionIds) {
          const txRows = await sql.begin(async (tx) => {
            await tx`SELECT set_config('app.tenant_id', ${tenant_id}, true)`;
            return tx<{ date: string }[]>`SELECT date::text AS date FROM transactions WHERE id = ${txId} LIMIT 1`;
          });
          const txDate = txRows[0]?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
          const ok = await db.jobQueue.enqueue("enrich", tenant_id, { transaction_id: txId, date: txDate }, txDate, 10);
          if (ok) enrichQueued++;
        }
        const { transactionIds: _, ...rest } = summary;
        return toolSuccess({ ...rest, enrich_queued: enrichQueued });
      } catch (err) {
        return toolError(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
