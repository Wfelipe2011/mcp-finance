import type {
  CashflowMensal,
  GastosMensais,
  Compromisso,
  CashflowProjetado,
  Runway,
  Patrimonio,
  InvestimentoMensal,
  Digest,
  DigestResponse,
  TransacoesResponse,
  Tendencias,
  User,
  ForecastGroupsResponse,
  ForecastCategoriesResponse,
  ForecastMessage,
  ChatRequest,
  ChatResponse,
  DailyInsight,
  CategoryExclusion,
  MessagesRange,
} from "./types.ts";

const BASE = "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(): never {
  localStorage.removeItem("authToken");
  window.dispatchEvent(new Event("auth:unauthorized"));
  throw new Error("Unauthorized");
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url, { headers: authHeaders() });
  if (res.status === 401) {
    return handleUnauthorized();
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

export async function fetchDigest(month: string): Promise<Digest | null> {
  const res = await get<DigestResponse>(`/api/digest?month=${month}`);
  return res.status === 'ready' ? (res.data ?? null) : null;
}

export function fetchTransacoes(month: string, limit = 50, offset = 0): Promise<TransacoesResponse> {
  return get<TransacoesResponse>(`/api/transacoes?month=${month}&limit=${limit}&offset=${offset}`);
}

export function fetchTendencias(): Promise<Tendencias> {
  return get<Tendencias>("/api/tendencias");
}

export function fetchForecastGroups(): Promise<ForecastGroupsResponse> {
  return get<ForecastGroupsResponse>("/api/forecast/groups");
}

export function fetchForecastCategories(): Promise<ForecastCategoriesResponse> {
  return get<ForecastCategoriesResponse>("/api/forecast/categories");
}

export function fetchForecastMessage(): Promise<ForecastMessage> {
  return get<ForecastMessage>("/api/forecast/message");
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
      return handleUnauthorized();
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

export async function postChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) {
    return handleUnauthorized();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<ChatResponse>;
}

export async function updateUserDisplayName(id: number, displayName: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName }),
  });
  if (res.status === 401) {
    return handleUnauthorized();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<User>;
}

export async function fetchDailyInsight(): Promise<DailyInsight | null> {
  const res = await fetch("/api/forecast/daily", { headers: authHeaders() });
  if (res.status === 401) return handleUnauthorized();
  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<DailyInsight>;
}

export function fetchCategoryExclusions(): Promise<CategoryExclusion[]> {
  return get<CategoryExclusion[]>("/api/forecast/daily/category-exclusions");
}

export async function toggleCategoryExclusion(categoryPt: string, excluded: boolean): Promise<void> {
  const res = await fetch("/api/forecast/daily/category-exclusions", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ category_pt: categoryPt, excluded }),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
}

export async function addDailyExclusion(
  date: string,
  categoryPt: string,
  tag?: string,
): Promise<void> {
  const res = await fetch("/api/forecast/daily/daily-exclusions", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ transaction_date: date, category_pt: categoryPt, correction_tag: tag ?? null }),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
}

export async function removeDailyExclusion(date: string, categoryPt: string): Promise<void> {
  const res = await fetch("/api/forecast/daily/daily-exclusions", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ transaction_date: date, category_pt: categoryPt, remove: true }),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
}

export function fetchMessagesRange(): Promise<MessagesRange> {
  return get<MessagesRange>("/api/forecast/daily/messages-range");
}

export async function regenerateDailyInsight(): Promise<DailyInsight> {
  const res = await fetch("/api/forecast/daily/regenerate", {
    method: "POST",
    headers: authHeaders(),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error((body as { error?: string }).error ?? res.statusText), { status: res.status });
  }
  return res.json() as Promise<DailyInsight>;
}
