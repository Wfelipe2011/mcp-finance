import type { Account } from "../../entities/Account.ts";

export interface AccountRepository {
  upsertMany(accounts: Account[]): Promise<void>;
}
