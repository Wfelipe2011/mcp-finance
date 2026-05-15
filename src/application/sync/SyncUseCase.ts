import type { TokenPort } from "../../domain/ports/TokenPort.ts";
import type { PluggyPort } from "../../domain/ports/PluggyPort.ts";
import type { ItemRepository } from "../../domain/ports/repositories/ItemRepository.ts";
import type { AccountRepository } from "../../domain/ports/repositories/AccountRepository.ts";
import type { TransactionRepository } from "../../domain/ports/repositories/TransactionRepository.ts";
import type { InvestmentRepository } from "../../domain/ports/repositories/InvestmentRepository.ts";
import type { InvestmentTransactionRepository } from "../../domain/ports/repositories/InvestmentTransactionRepository.ts";
import type { EnrichTransactionsRepository } from "../../domain/ports/repositories/EnrichTransactionsRepository.ts";
import { PluggyHttpAdapter } from "../../infrastructure/pluggy/PluggyHttpAdapter.ts";

export interface SyncDeps {
  tokenPort: TokenPort;
  itemRepo: ItemRepository;
  accountRepo: AccountRepository;
  transactionRepo: TransactionRepository;
  investmentRepo: InvestmentRepository;
  investmentTransactionRepo: InvestmentTransactionRepository;
  enrichTransactionRepo: EnrichTransactionsRepository;
}

export interface SyncSummary {
  items: number;
  accounts: number;
  transactions: number;
  investments: number;
  durationMs: number;
  transactionIds: string[];
}

export class SyncUseCase {
  private readonly deps: SyncDeps;

  constructor(deps: SyncDeps) {
    this.deps = deps;
  }

  async run(): Promise<SyncSummary> {
    const start = Date.now();
    const { tokenPort, itemRepo, accountRepo, transactionRepo,
            investmentRepo, investmentTransactionRepo,
            enrichTransactionRepo } = this.deps;

    // 1. Token
    const token = await tokenPort.getToken();
    const pluggy: PluggyPort = new PluggyHttpAdapter(token);

    // 2. Items
    console.log("[sync] Fetching items...");
    const items = await pluggy.fetchItems();
    await itemRepo.upsertMany(items);
    console.log(`[sync] Items: ${items.length}`);

    const itemIds = items.map((i) => i.id);

    // 3. Accounts + Investments (paralelo)
    console.log("[sync] Fetching accounts and investments...");
    const [accounts, investments] = await Promise.all([
      pluggy.fetchAccounts(itemIds),
      pluggy.fetchInvestments(itemIds),
    ]);
    await accountRepo.upsertMany(accounts);
    await investmentRepo.upsertMany(investments);
    console.log(`[sync] Accounts: ${accounts.length}, Investments: ${investments.length}`);

    // 4. Transactions (fan-out por account) + InvestmentTransactions (fan-out por investment)
    console.log("[sync] Fetching transactions and investment transactions...");
    const txBatches = await Promise.all(accounts.map((a) => pluggy.fetchTransactions(a.id)));
    const allTx = txBatches.flat();
    await transactionRepo.upsertMany(allTx);
    console.log(`[sync] Transactions: ${allTx.length}`);

    const invTxBatches = await Promise.all(
      investments.map((inv) => pluggy.fetchInvestmentTransactions(inv.id)),
    );
    const allInvTx = invTxBatches.flat();
    await investmentTransactionRepo.insertMany(allInvTx);
    console.log(`[sync] Investment transactions: ${allInvTx.length}`);

    // 5. Enrich transactions (camada bronze)
    console.log("[sync] Enriching transactions...");
    await enrichTransactionRepo.enrich();
    console.log("[sync] Transactions enriched.");

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[sync] Done in ${elapsed}s`);
    return {
      items: items.length,
      accounts: accounts.length,
      transactions: allTx.length,
      investments: investments.length,
      durationMs: Date.now() - start,
      transactionIds: allTx.map((t) => t.id),
    };
  }
}
