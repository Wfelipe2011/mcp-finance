import type { Investment } from "../../entities/Investment.ts";

export interface InvestmentRepository {
  upsertMany(investments: Investment[]): Promise<void>;
}
