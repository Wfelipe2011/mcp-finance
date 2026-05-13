import type { Item } from "../../entities/Item.ts";

export interface ItemRepository {
  upsertMany(items: Item[]): Promise<void>;
}
