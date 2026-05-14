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
} from "./types.ts";

const BASE = "";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url);
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
