import type { TokenPort } from "../../domain/ports/TokenPort.ts";

type TokenResponse = {
  token: string;
  saved_at: string;
  expires_at: string;
};

export class TokenHttpAdapter implements TokenPort {
  private readonly url: string;

  constructor() {
    this.url = process.env["TOKEN_URL"] ?? "http://auth:3000/token";
  }

  async getToken(): Promise<string> {
    const res = await fetch(this.url);

    if (!res.ok) {
      throw new Error(
        `TokenHttpAdapter: failed to fetch token from ${this.url} — HTTP ${res.status}`
      );
    }

    const data = (await res.json()) as unknown;

    // Accept both array and object responses
    let entry: TokenResponse;
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error(
          `TokenHttpAdapter: expected non-empty array from ${this.url}`
        );
      }
      entry = data[0] as TokenResponse;
    } else if (data !== null && typeof data === "object") {
      entry = data as TokenResponse;
    } else {
      throw new Error(
        `TokenHttpAdapter: unexpected response from ${this.url}: ${JSON.stringify(data)}`
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
