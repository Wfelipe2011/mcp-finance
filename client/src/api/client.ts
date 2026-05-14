import type {
  CashflowMensal,
  GastosMensais,
  Compromisso,
  CashflowProjetado,
  Runway,
  Patrimonio,
  InvestimentoMensal,
  Digest,
  TransacoesResponse,
  Tendencias,
  User,
} from "./types.ts";

const BASE = "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url, { headers: authHeaders() });
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    window.location.reload();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export function fetchMeses(): Promise<string[]> {
  return get<string[]>("/api/meses");
}

export function fetchCashflow(month: string): Promise<CashflowMensal> {
  return get<CashflowMensal>(`/api/cashflow?month=${month}`);
}

export function fetchGastos(month: string): Promise<GastosMensais> {
  return get<GastosMensais>(`/api/gastos?month=${month}`);
}

export function fetchCompromissos(): Promise<Compromisso[]> {
  return get<Compromisso[]>("/api/compromissos");
}

export function fetchCashflowProjetado(): Promise<CashflowProjetado[]> {
  return get<CashflowProjetado[]>("/api/cashflow/projetado");
}

export function fetchRunway(): Promise<Runway> {
  return get<Runway>("/api/runway");
}

export function fetchPatrimonio(): Promise<Patrimonio> {
  return get<Patrimonio>("/api/patrimonio");
}

export function fetchInvestimentos(months = 6): Promise<InvestimentoMensal[]> {
  return get<InvestimentoMensal[]>(`/api/investimentos?months=${months}`);
}

export function fetchDigest(month: string): Promise<Digest> {
  return get<Digest>(`/api/digest?month=${month}`);
}

export function fetchTransacoes(month: string, limit = 50, offset = 0): Promise<TransacoesResponse> {
  return get<TransacoesResponse>(`/api/transacoes?month=${month}&limit=${limit}&offset=${offset}`);
}

export function fetchTendencias(): Promise<Tendencias> {
  return get<Tendencias>("/api/tendencias");
}

export interface SyncSummary {
  items: number;
  accounts: number;
  transactions: number;
  investments: number;
  durationMs: number;
}

export async function triggerSync(): Promise<SyncSummary> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: authHeaders(),
      signal: controller.signal,
    });
    if (res.status === 401) {
      localStorage.removeItem("authToken");
      window.location.reload();
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((body as { error?: string }).error ?? res.statusText);
    }
    return res.json() as Promise<SyncSummary>;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function fetchUsers(): Promise<User[]> {
  return get<User[]>("/api/users");
}

export async function updateUserDisplayName(id: number, displayName: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName }),
  });
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    window.location.reload();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<User>;
}
