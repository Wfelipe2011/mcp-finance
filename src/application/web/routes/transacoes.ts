import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse, parseMonth } from "../helpers.ts";

export async function handleTransacoes(_req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const parsed = parseMonth(url.searchParams.get("month"));
  if (!parsed) return errorResponse("Invalid month format. Use YYYY-MM", 400);
  const limit  = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit")  ?? "50", 10) || 50));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const data = await db.getTransacoesMensais(parsed.year, parsed.month, limit, offset);
  return jsonResponse(data);
}

export async function handlePatchCategoria(req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  // path: /api/transacoes/:id/categoria
  const segments = url.pathname.split("/");
  const transactionId = segments[segments.length - 2]; // id vem antes de /categoria
  if (!transactionId) return errorResponse("ID da transação inválido", 400);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const { category_id } = body;
  if (typeof category_id !== "string" || category_id.trim() === "") {
    return errorResponse("category_id é obrigatório", 400);
  }

  try {
    const ok = await db.transactionCategory.override(transactionId, category_id.trim());
    if (!ok) return errorResponse("Transação não encontrada", 404);
    return jsonResponse({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}
export async function handleCountByDescriptionLike(_req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const text = url.searchParams.get("description_like") ?? "";
  if (!text.trim()) return jsonResponse({ count: 0 });

  try {
    const count = await db.transactionCategory.countByDescriptionLike(text.trim());
    return jsonResponse({ count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}
