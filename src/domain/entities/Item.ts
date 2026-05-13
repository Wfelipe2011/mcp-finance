export type Item = {
  id: string;
  connector: string | null;
  status: string | null;
  executionStatus: string | null;
  products: string | null; // JSON array serializado
  lastUpdatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  syncedAt: string;
};
