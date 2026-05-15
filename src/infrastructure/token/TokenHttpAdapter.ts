import { SQL } from "bun";
import type { TokenPort } from "../../domain/ports/TokenPort.ts";

type TokenResponse = {
  token: string;
  saved_at: string;
  expires_at: string;
};

export class TokenHttpAdapter implements TokenPort {
  private readonly baseUrl: string;
  private readonly tenantId: string | undefined;

  constructor(tenantId?: string) {
    this.baseUrl = process.env["TOKEN_URL"] ?? "http://auth:3000/token";
    this.tenantId = tenantId;
  }

  async getToken(): Promise<string> {
    const dbUrl = process.env["DATABASE_URL"];
    if (!dbUrl) throw new Error("DATABASE_URL is not set");
    if (!this.tenantId) throw new Error("TokenHttpAdapter: tenantId é obrigatório para buscar credenciais Pluggy");
    const sql = new SQL(dbUrl);
    let pluggyEmail: string;
    let pluggyPassword: string;
    try {
      const rows = await sql<{ pluggy_email: string; pluggy_password: string }[]>`
        SELECT pluggy_email, pluggy_password FROM tenants WHERE id = ${this.tenantId}::UUID LIMIT 1
      `;
      if (!rows[0]) {
        throw new Error(`TokenHttpAdapter: tenant ${this.tenantId} não encontrado`);
      }
      pluggyEmail = rows[0].pluggy_email;
      pluggyPassword = rows[0].pluggy_password;
    } finally {
      await sql.close();
    }

    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pluggyEmail, appPassword: pluggyPassword }),
    });

    if (!res.ok) {
      throw new Error(
        `TokenHttpAdapter: failed to fetch token from ${this.baseUrl} — HTTP ${res.status}`
      );
    }

    const data = (await res.json()) as unknown;

    // Accept both array and object responses
    let entry: TokenResponse;
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error(
          `TokenHttpAdapter: expected non-empty array from ${this.baseUrl}`
        );
      }
      entry = data[0] as TokenResponse;
    } else if (data !== null && typeof data === "object") {
      entry = data as TokenResponse;
    } else {
      throw new Error(
        `TokenHttpAdapter: unexpected response from ${this.baseUrl}: ${JSON.stringify(data)}`
      );
    }

    if (!entry.token) {
      throw new Error(
        `TokenHttpAdapter: response missing 'token' field: ${JSON.stringify(entry)}`
      );
    }

    const expiresAt = new Date(entry.expires_at);
    if (expiresAt < new Date()) {
      console.warn(
        `[TokenHttpAdapter] WARNING: token expired at ${entry.expires_at} — proceeding anyway`
      );
    }

    return entry.token;
  }
}

