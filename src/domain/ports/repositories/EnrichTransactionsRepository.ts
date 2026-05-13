export interface EnrichTransactionsRepository {
  enrich(): Promise<void>;
}
