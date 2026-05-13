import type { Transaction } from "../../entities/Transaction.ts";

export interface TransactionRepository {
  upsertMany(transactions: Transaction[]): Promise<void>;
}
