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
  Goal,
  GoalType,
  BudgetExecution,
  CategorizationRule,
  CategoryLabel,
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

export function fetchGoals(): Promise<Goal[]> {
  return get<Goal[]>("/api/goals");
}

export interface CreateGoalData {
  name: string;
  goal_type: GoalType;
  target_amount: number;
  category_group?: string;
  deadline?: string;
  notes?: string;
}

export async function createGoal(data: CreateGoalData): Promise<Goal> {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<Goal>;
}

export async function updateGoal(id: number, data: Partial<Pick<Goal, 'name' | 'current_amount' | 'deadline' | 'status' | 'notes' | 'target_amount'>>): Promise<Goal> {
  const res = await fetch(`/api/goals/${id}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<Goal>;
}

export async function deleteGoal(id: number): Promise<void> {
  const res = await fetch(`/api/goals/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
}

export function fetchBudgets(): Promise<BudgetExecution[]> {
  return get<BudgetExecution[]>("/api/budgets");
}

export async function upsertBudget(data: { category_pt: string; monthly_limit: number }): Promise<BudgetExecution> {
  const res = await fetch("/api/budgets", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<BudgetExecution>;
}

export async function deleteBudget(id: number): Promise<void> {
  const res = await fetch(`/api/budgets/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
}

// ── Export helpers ────────────────────────────────────────────────────────────

export function buildExportUrl(
  type: "transactions" | "summary",
  params: Record<string, string>,
): string {
  const base = `/api/export/${type}`;
  const query = new URLSearchParams(params).toString();
  return query ? `${base}?${query}` : base;
}

export function triggerDownload(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Regras de categorização ───────────────────────────────────────────────────

export function fetchRegras(): Promise<CategorizationRule[]> {
  return get<CategorizationRule[]>("/api/regras");
}

export async function createRegra(data: { value: string; category_id: string; note?: string }): Promise<CategorizationRule> {
  const res = await fetch("/api/regras", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<CategorizationRule>;
}

export async function updateRegra(id: number, data: Partial<{ value: string; category_id: string; note: string; is_active: boolean }>): Promise<CategorizationRule> {
  const res = await fetch(`/api/regras/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<CategorizationRule>;
}

export async function deleteRegra(id: number): Promise<void> {
  const res = await fetch(`/api/regras/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
}

export async function reorderRegra(id: number, direction: 'up' | 'down'): Promise<CategorizationRule[]> {
  const res = await fetch(`/api/regras/${id}/prioridade`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<CategorizationRule[]>;
}

export async function aplicarHistorico(id: number): Promise<{ affected: number }> {
  const res = await fetch(`/api/regras/${id}/aplicar-historico`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ affected: number }>;
}

// ── Categorias ────────────────────────────────────────────────────────────────

export function fetchCategorias(): Promise<CategoryLabel[]> {
  return get<CategoryLabel[]>("/api/categorias");
}

// ── Override de categoria de transação ───────────────────────────────────────

export async function patchCategoriaTransacao(transactionId: string, categoryId: string): Promise<void> {
  const res = await fetch(`/api/transacoes/${transactionId}/categoria`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ category_id: categoryId }),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
}

export function countTransacoesSimilares(descriptionLike: string): Promise<{ count: number }> {
  const q = encodeURIComponent(descriptionLike);
  return get<{ count: number }>(`/api/transacoes/count?description_like=${q}`);
}

/** Faz fetch do CSV, trata 422 e dispara download via blob. Retorna mensagem de erro ou null se OK. */
export async function fetchCsvExport(
  url: string,
  filename: string,
): Promise<string | null> {
  const res = await fetch(BASE + url, { headers: authHeaders() });
  if (res.status === 401) return handleUnauthorized();
  if (res.status === 422) {
    const body = await res.json().catch(() => ({ error: "Muitos registros." }));
    return (
      (body as { error?: string }).error ??
      "Muitos registros. Reduza o período ou adicione filtro de categoria."
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
  return null;
}

export async function openHtmlExport(url: string): Promise<string | null> {
  const target = window.open("", "_blank");
  if (!target) {
    return "Não foi possível abrir a nova aba. Verifique o bloqueador de pop-ups do navegador.";
  }
  target.opener = null;

  const res = await fetch(BASE + url, { headers: authHeaders() });
  if (res.status === 401) {
    target.close();
    return handleUnauthorized();
  }
  if (!res.ok) {
    target.close();
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }

  const html = await res.text();
  const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  target.location.href = blobUrl;
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  return null;
}

// ── Admin API ─────────────────────────────────────────────────────────────

export interface AdminTenant {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminQueueStats {
  total: number;
  pending: number;
  running: number;
  done: number;
  error: number;
  skipped?: number;
}

export type AdminQueueStatsByType = Record<"enrich" | "digest" | "forecast" | "dailyInsight", AdminQueueStats>;

type RawAdminQueueStats = Partial<AdminQueueStats>;

export interface AdminWorker {
  id: string;
  name: string;
  status: string;
  last_seen_at: string | null;
  jobs_done: number;
  ai_base_url: string;
  ai_model: string;
}

export interface CreateTenantData {
  name: string;
  email: string;
  password: string;
  pluggy_email?: string;
  pluggy_password?: string;
}

function normalizeQueueStats(stats: RawAdminQueueStats): AdminQueueStats {
  const pending = stats.pending ?? 0;
  const running = stats.running ?? 0;
  const done = stats.done ?? 0;
  const error = stats.error ?? 0;
  const skipped = stats.skipped ?? 0;
  return {
    total: stats.total ?? pending + running + done + error + skipped,
    pending,
    running,
    done,
    error,
    skipped,
  };
}

export function adminListTenants(): Promise<AdminTenant[]> {
  return get<AdminTenant[]>("/api/admin/tenants");
}

export async function adminToggleTenantStatus(id: string, status: string): Promise<AdminTenant> {
  const res = await fetch(`/api/admin/tenants/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<AdminTenant>;
}

export async function adminCreateTenant(data: CreateTenantData): Promise<AdminTenant> {
  const res = await fetch("/api/admin/tenants", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<AdminTenant>;
}

export async function adminQueueStats(): Promise<AdminQueueStatsByType> {
  const [enrich, digest, forecast, dailyInsight] = await Promise.all([
    get<RawAdminQueueStats>("/api/admin/queue-stats"),
    get<RawAdminQueueStats>("/api/admin/digest/queue-stats"),
    get<RawAdminQueueStats>("/api/admin/forecast/queue-stats"),
    get<RawAdminQueueStats>("/api/admin/daily-insight/queue-stats"),
  ]);
  return {
    enrich: normalizeQueueStats(enrich),
    digest: normalizeQueueStats(digest),
    forecast: normalizeQueueStats(forecast),
    dailyInsight: normalizeQueueStats(dailyInsight),
  };
}

export async function adminEnqueueDigest(tenantId?: string): Promise<void> {
  const res = await fetch("/api/admin/digest/enqueue", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: tenantId ? JSON.stringify({ tenant_id: tenantId }) : undefined,
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
}

export async function adminEnqueueEnrich(tenantId?: string): Promise<void> {
  const res = await fetch("/api/admin/enrich/enqueue", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: tenantId ? JSON.stringify({ tenant_id: tenantId }) : undefined,
  });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
}

export function adminListWorkers(): Promise<AdminWorker[]> {
  return get<AdminWorker[]>("/api/admin/workers");
}
