import type { Identity } from "../../entities/Identity.ts";

export interface IdentityRepository {
  upsertMany(identities: Identity[]): Promise<void>;
}
