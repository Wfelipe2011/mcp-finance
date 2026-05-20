import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

export async function handleGetBudgets(_req: Request, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  try {
    const budgets = await db.budgets.getAll();
    return jsonResponse(budgets);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleUpsertBudget(req: Request, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const { category_pt, monthly_limit } = body;

  if (typeof category_pt !== "string" || category_pt.trim() === "") {
    return errorResponse("category_pt é obrigatório e deve ser texto não-vazio", 400);
  }
  if (typeof monthly_limit !== "number" || monthly_limit <= 0) {
    return errorResponse("monthly_limit deve ser um número maior que zero", 400);
  }

  try {
    await db.budgets.upsert({
      category_pt: category_pt.trim(),
      monthly_limit,
    });
    const budgets = await db.budgets.getAll();
    const budget = budgets.find((item) => item.category_pt === category_pt.trim());
    return jsonResponse(budget ?? null, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleDeleteBudget(req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const segments = url.pathname.split("/");
  const idStr = segments[segments.length - 1];
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return errorResponse("ID inválido", 400);

  try {
    await db.budgets.remove(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}
