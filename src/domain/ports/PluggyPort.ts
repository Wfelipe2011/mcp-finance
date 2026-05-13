import type { Item } from "../entities/Item.ts";
import type { Account } from "../entities/Account.ts";
import type { Investment } from "../entities/Investment.ts";
import type { Transaction } from "../entities/Transaction.ts";
import type { InvestmentTransaction } from "../entities/InvestmentTransaction.ts";
import type { Identity } from "../entities/Identity.ts";

export interface PluggyPort {
  fetchItems(): Promise<Item[]>;
  fetchAccounts(itemIds: string[]): Promise<Account[]>;
  fetchInvestments(itemIds: string[]): Promise<Investment[]>;
  fetchTransactions(accountId: string): Promise<Transaction[]>;
  fetchInvestmentTransactions(investmentId: string): Promise<InvestmentTransaction[]>;
  fetchIdentity(itemId: string): Promise<Identity | null>;
}
