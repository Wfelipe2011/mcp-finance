import type { PluggyPort } from "../../domain/ports/PluggyPort.ts";
import type { Item } from "../../domain/entities/Item.ts";
import type { Account } from "../../domain/entities/Account.ts";
import type { Transaction } from "../../domain/entities/Transaction.ts";
import type { Investment } from "../../domain/entities/Investment.ts";
import type { InvestmentTransaction } from "../../domain/entities/InvestmentTransaction.ts";
import {
  mapItem,
  mapAccount,
  mapTransaction,
  mapInvestment,
  mapInvestmentTransaction,
  asRawItem,
  asRawAccount,
  asRawTransaction,
  asRawInvestment,
  asRawInvestmentTransaction,
} from "./PluggyMappers.ts";

const BASE_URL = "https://my-api.pluggy.ai";

export class PluggyHttpAdapter implements PluggyPort {
  private readonly headers: Record<string, string>;

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  private async get(path: string): Promise<unknown> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, { headers: this.headers });

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable body)");
      throw new Error(
        `PluggyHttpAdapter: HTTP ${res.status} on GET ${url}\n${body}`
      );
    }

    return res.json() as Promise<unknown>;
  }

  async fetchItems(): Promise<Item[]> {
    const data = await this.get("/items?only_my_items=true");
    if (!Array.isArray(data)) {
      throw new Error("PluggyHttpAdapter.fetchItems: expected array");
    }
    return data.map((v) => mapItem(asRawItem(v)));
  }

  async fetchAccounts(itemIds: string[]): Promise<Account[]> {
    if (itemIds.length === 0) return [];
    const qs = itemIds.map((id) => `itemId=${encodeURIComponent(id)}`).join("&");
    const data = await this.get(`/accounts?${qs}`);
    if (!Array.isArray(data)) {
      throw new Error("PluggyHttpAdapter.fetchAccounts: expected array");
    }
    return data.map((v) => mapAccount(asRawAccount(v)));
  }

  async fetchInvestments(itemIds: string[]): Promise<Investment[]> {
    if (itemIds.length === 0) return [];
    const qs = itemIds.map((id) => `itemId=${encodeURIComponent(id)}`).join("&");
    const data = await this.get(`/investments?${qs}`);
    if (!Array.isArray(data)) {
      throw new Error("PluggyHttpAdapter.fetchInvestments: expected array");
    }
    return data.map((v) => mapInvestment(asRawInvestment(v)));
  }

  async fetchTransactions(accountId: string): Promise<Transaction[]> {
    const results: Transaction[] = [];
    let page = 1;

    while (true) {
      const qs = `accountId=${encodeURIComponent(accountId)}&page=${page}`;
      const data = await this.get(`/transactions?${qs}`);

      // Response may be a plain array or a paginated object { results, total, totalPages, page }
      if (Array.isArray(data)) {
        results.push(...data.map((v) => mapTransaction(asRawTransaction(v), accountId)));
        break; // plain array → no pagination
      }

      const paginated = data as { results?: unknown[]; total?: number; totalPages?: number; page?: number };

      if (!Array.isArray(paginated.results)) {
        throw new Error("PluggyHttpAdapter.fetchTransactions: unexpected response shape");
      }

      results.push(
        ...paginated.results.map((v) => mapTransaction(asRawTransaction(v), accountId))
      );

      const totalPages = paginated.totalPages ?? 1;
      if (page >= totalPages) break;
      page++;
    }

    return results;
  }

  async fetchInvestmentTransactions(investmentId: string): Promise<InvestmentTransaction[]> {
    const results: InvestmentTransaction[] = [];
    let page = 1;

    while (true) {
      const data = await this.get(
        `/investments/${encodeURIComponent(investmentId)}/transactions?page=${page}`
      );

      const paginated = data as { results?: unknown[]; totalPages?: number };

      if (!Array.isArray(paginated.results)) {
        throw new Error(
          "PluggyHttpAdapter.fetchInvestmentTransactions: unexpected response shape"
        );
      }

      results.push(
        ...paginated.results.map((v) =>
          mapInvestmentTransaction(asRawInvestmentTransaction(v), investmentId)
        )
      );

      const totalPages = paginated.totalPages ?? 1;
      if (page >= totalPages) break;
      page++;
    }

    return results;
  }
}
