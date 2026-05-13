import type { InvestmentTransaction } from "../../entities/InvestmentTransaction.ts";

export interface InvestmentTransactionRepository {
  insertMany(transactions: InvestmentTransaction[]): Promise<void>;
}
