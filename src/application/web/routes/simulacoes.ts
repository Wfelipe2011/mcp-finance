import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import type { SimulationItemRow, SimulationMonthRow } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";
import { generateSimulationMessage } from "../../../infrastructure/ai/simulationAgent.ts";

// ── Tipos de payload ─────────────────────────────────────────────────────────

export interface SimulationItemPayload {
  item_type: 'new_purchase' | 'recurring' | 'income_adjustment' | 'exclusion';
  label: string;
  category_pt?: string | null;
  total_amount?: number | null;
  installments?: number | null;
  monthly_amount?: number | null;
  is_exclusion?: boolean;
  excluded_transaction_ids?: string[] | null;
  direction?: 'income' | 'expense' | null;
}

export interface SimulationCalculatePayload {
  horizon_months: number;
  items: SimulationItemPayload[];
  exclusions?: string[]; // transaction IDs to exclude from historical averages
}

export interface SimulationCreatePayload extends SimulationCalculatePayload {
  name: string;
}

// ── Motor de cálculo ─────────────────────────────────────────────────────────

async function calculate(
  db: BunPgAdapter,
  payload: SimulationCalculatePayload,
): Promise<SimulationMonthRow[]> {
  const exclusions = payload.exclusions ?? [];

  // Coletar IDs excluídos dos itens tipo 'exclusion'
  const exclusionItems = payload.items.filter(i => i.item_type === 'exclusion');
  const allExcluded = [
    ...exclusions,
    ...exclusionItems.flatMap(i => i.excluded_transaction_ids ?? []),
  ].filter(Boolean);

  // Médias históricas e compromissos ativos em paralelo
  const [historicals, commitments] = await Promise.all([
    db.getHistoricalAverages(payload.horizon_months, allExcluded),
    db.getActiveCommitmentsForSimulation(),
  ]);

  const baseIncome = historicals
    .filter(h => h.is_income)
    .reduce((sum, h) => sum + h.avg_monthly, 0);

  const baseExpenses = historicals
    .filter(h => !h.is_income)
    .reduce((sum, h) => sum + h.avg_monthly, 0);

  // Calcular itens de simulação
  const incomeAdjustments = payload.items
    .filter(i => i.item_type === 'income_adjustment' && i.direction === 'income')
    .reduce((sum, i) => sum + (i.monthly_amount ?? 0), 0);

  // Projetar mês a mês
  const now = new Date();
  const months: SimulationMonthRow[] = [];

  for (let offset = 0; offset < payload.horizon_months; offset++) {
    const projDate = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    const year = projDate.getFullYear();
    const month = projDate.getMonth() + 1;

    let income = baseIncome + incomeAdjustments;
    let expenses = baseExpenses;

    // Adicionar compromissos ativos que ainda persistem neste mês
    for (const c of commitments) {
      if (offset < c.remaining_months) {
        expenses += c.monthly_amount;
      }
    }

    // Aplicar itens novos
    for (const item of payload.items) {
      if (item.item_type === 'new_purchase') {
        const installments = item.installments ?? 1;
        if (offset < installments) {
          const monthly = item.monthly_amount ?? (item.total_amount ? item.total_amount / installments : 0);
          expenses += monthly;
        }
      } else if (item.item_type === 'recurring') {
        if (item.direction === 'income') {
          income += item.monthly_amount ?? 0;
        } else {
          expenses += item.monthly_amount ?? 0;
        }
      } else if (item.item_type === 'income_adjustment' && item.direction === 'expense') {
        expenses += item.monthly_amount ?? 0;
      }
    }

    months.push({
      simulation_id: "",
      tenant_id: "",
      month_offset: offset,
      year,
      month,
      total_income: Math.round(income * 100) / 100,
      total_expenses: Math.round(expenses * 100) / 100,
      balance: Math.round((income - expenses) * 100) / 100,
    });
  }

  return months;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function handleCalculateSimulation(
  req: Request,
  _url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const payload = body as SimulationCalculatePayload;
  const horizon = Number(payload.horizon_months);
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 24) {
    return errorResponse("horizon_months deve ser inteiro entre 1 e 24", 400);
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return errorResponse("items deve ser um array com ao menos um item", 400);
  }

  const db = new BunPgAdapter(tenantId, sql);
  try {
    const months = await calculate(db, { ...payload, horizon_months: horizon });
    return jsonResponse({ months });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleCreateSimulation(
  req: Request,
  _url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const payload = body as SimulationCreatePayload;
  if (typeof payload.name !== "string" || payload.name.trim() === "") {
    return errorResponse("name é obrigatório", 400);
  }
  const horizon = Number(payload.horizon_months);
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 24) {
    return errorResponse("horizon_months deve ser inteiro entre 1 e 24", 400);
  }
  if (!Array.isArray(payload.items)) {
    return errorResponse("items deve ser um array", 400);
  }

  const db = new BunPgAdapter(tenantId, sql);
  try {
    // 1. Calcular
    const months = await calculate(db, { ...payload, horizon_months: horizon });

    // 2. Gerar mensagem LLM (graceful degradation)
    let llm_message: string | null = null;
    let llm_model: string | null = null;
    try {
      const agentResult = await generateSimulationMessage(payload.name.trim(), months);
      if (agentResult) {
        llm_message = agentResult.message;
        llm_model = process.env["AI_MODEL"] ?? null;
      }
    } catch {
      // falha silenciosa — salva sem mensagem LLM
    }

    // 3. Persistir simulação
    const sim = await db.createSimulation({
      name: payload.name.trim(),
      horizon_months: horizon,
      llm_message,
      llm_model,
    });

    // 4. Persistir itens
    const itemsToSave: Omit<SimulationItemRow, 'id' | 'simulation_id' | 'tenant_id'>[] =
      (payload.items as SimulationItemPayload[]).map(i => ({
        item_type: i.item_type,
        label: i.label,
        category_pt: i.category_pt ?? null,
        total_amount: i.total_amount ?? null,
        installments: i.installments ?? null,
        monthly_amount: i.monthly_amount ?? null,
        is_exclusion: i.is_exclusion ?? false,
        excluded_transaction_ids: i.excluded_transaction_ids ?? null,
        direction: i.direction ?? null,
      }));
    await db.saveSimulationItems(sim.id, itemsToSave);

    // 5. Persistir meses
    const monthsToSave: Omit<SimulationMonthRow, 'simulation_id' | 'tenant_id'>[] =
      months.map(m => ({
        month_offset: m.month_offset,
        year: m.year,
        month: m.month,
        total_income: m.total_income,
        total_expenses: m.total_expenses,
        balance: m.balance,
      }));
    await db.saveSimulationMonths(sim.id, monthsToSave);

    // 6. Retornar simulação completa
    const full = await db.getSimulationById(sim.id);
    return jsonResponse(full, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleUpdateSimulation(
  req: Request,
  url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 1];
  if (!id) return errorResponse("ID inválido", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const payload = body as SimulationCreatePayload;
  if (typeof payload.name !== "string" || payload.name.trim() === "") {
    return errorResponse("name é obrigatório", 400);
  }
  const horizon = Number(payload.horizon_months);
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 24) {
    return errorResponse("horizon_months deve ser inteiro entre 1 e 24", 400);
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return errorResponse("items deve ser um array com ao menos um item", 400);
  }

  const db = new BunPgAdapter(tenantId, sql);
  try {
    const months = await calculate(db, { ...payload, horizon_months: horizon });

    let llm_message: string | null = null;
    let llm_model: string | null = null;
    const agentResult = await generateSimulationMessage(payload.name.trim(), months);
    if (agentResult) {
      llm_message = agentResult.message;
      llm_model = process.env["AI_MODEL"] ?? null;
    }

    const updated = await db.updateSimulation({
      id,
      name: payload.name.trim(),
      horizon_months: horizon,
      llm_message,
      llm_model,
    });
    if (!updated) return errorResponse("Simulação não encontrada", 404);

    const itemsToSave: Omit<SimulationItemRow, 'id' | 'simulation_id' | 'tenant_id'>[] =
      (payload.items as SimulationItemPayload[]).map(i => ({
        item_type: i.item_type,
        label: i.label,
        category_pt: i.category_pt ?? null,
        total_amount: i.total_amount ?? null,
        installments: i.installments ?? null,
        monthly_amount: i.monthly_amount ?? null,
        is_exclusion: i.is_exclusion ?? false,
        excluded_transaction_ids: i.excluded_transaction_ids ?? null,
        direction: i.direction ?? null,
      }));
    await db.saveSimulationItems(id, itemsToSave, { replace: true });

    const monthsToSave: Omit<SimulationMonthRow, 'simulation_id' | 'tenant_id'>[] =
      months.map(m => ({
        month_offset: m.month_offset,
        year: m.year,
        month: m.month,
        total_income: m.total_income,
        total_expenses: m.total_expenses,
        balance: m.balance,
      }));
    await db.saveSimulationMonths(id, monthsToSave);

    const full = await db.getSimulationById(id);
    return jsonResponse(full);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleGetSimulations(
  _req: Request,
  _url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  try {
    const sims = await db.getSimulations();
    return jsonResponse(sims);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleGetSimulationById(
  _req: Request,
  url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 1];
  if (!id) return errorResponse("ID inválido", 400);

  const db = new BunPgAdapter(tenantId, sql);
  try {
    const sim = await db.getSimulationById(id);
    if (!sim) return errorResponse("Simulação não encontrada", 404);
    return jsonResponse(sim);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handlePatchSimulation(
  req: Request,
  url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 1];
  if (!id) return errorResponse("ID inválido", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const { status } = body as { status?: string };
  if (status !== "open" && status !== "closed") {
    return errorResponse("status deve ser 'open' ou 'closed'", 400);
  }

  const db = new BunPgAdapter(tenantId, sql);
  try {
    const updated = await db.updateSimulationStatus(id, status);
    if (!updated) return errorResponse("Simulação não encontrada", 404);
    return jsonResponse(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}
