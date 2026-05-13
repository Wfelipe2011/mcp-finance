import { TokenHttpAdapter } from "../infrastructure/token/TokenHttpAdapter.ts";
import { BunPgAdapter } from "../infrastructure/db/BunPgAdapter.ts";
import { SyncUseCase } from "../application/sync/SyncUseCase.ts";

const db = new BunPgAdapter();
const tokenPort = new TokenHttpAdapter();

const useCase = new SyncUseCase({
  tokenPort,
  itemRepo: db.items,
  accountRepo: db.accounts,
  transactionRepo: db.transactions,
  investmentRepo: db.investments,
  investmentTransactionRepo: db.investmentTransactions,
  identityRepo: db.identities,
  enrichTransactionRepo: db.enrichTransactions,
});

useCase.run()
  .then(async () => { await db.close(); })
  .catch(async (err: unknown) => {
    console.error("[sync] Fatal error:", err);
    await db.close();
    process.exit(1);
  });
