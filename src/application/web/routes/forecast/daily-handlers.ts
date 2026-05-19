import { SQL } from "bun";
import { errorResponse, jsonResponse } from "../../helpers.ts";

// ─── 4.6 GET /api/forecast/daily/category-exclusions ────────────────────────
export async function handleDailyCategoryExclusionsGet(
  req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const { allCategories, excluded } = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    const allCategories = await tx`
      SELECT DISTINCT COALESCE(category_pt, 'Sem Categoria') AS category_pt
      FROM transactions_enriched te
      JOIN tenant_members tm ON tm.name = te.owner_normalized AND tm.tenant_id = te.tenant_id
      WHERE tm.tenant_id = ${tenantId}::uuid
        AND te.amount < 0
      ORDER BY 1
    `;
    const excluded = await tx`
      SELECT category_pt FROM forecast_category_exclusions
      WHERE tenant_id = ${tenantId}::uuid
    `;
    return { allCategories, excluded };
  });

  const excludedSet = new Set(excluded.map((r: any) => r.category_pt));
  const result = allCategories.map((r: any) => ({
    category_pt: r.category_pt,
    excluded: excludedSet.has(r.category_pt),
  }));

  return jsonResponse(result);
}

async function setCategoryExclusion(
  tenantId: string,
  sql: SQL,
  category_pt: string,
  excluded: boolean,
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    if (excluded) {
      await tx`
        INSERT INTO forecast_category_exclusions (tenant_id, category_pt)
        VALUES (${tenantId}::uuid, ${category_pt})
        ON CONFLICT (tenant_id, category_pt) DO NOTHING
      `;
    } else {
      await tx`
        DELETE FROM forecast_category_exclusions
        WHERE tenant_id = ${tenantId}::uuid AND category_pt = ${category_pt}
      `;
    }
  });
}

// ─── 4.7 POST /api/forecast/daily/category-exclusions ───────────────────────
export async function handleDailyCategoryExclusionsPost(
  req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("JSON inválido", 400);
  }

  const { category_pt, excluded } = body as Record<string, unknown>;
  if (!category_pt || typeof category_pt !== "string") {
    return errorResponse("category_pt é obrigatório", 400);
  }
  if (typeof excluded !== "boolean") {
    return errorResponse("excluded deve ser boolean", 400);
  }

  await setCategoryExclusion(tenantId, sql, category_pt, excluded);

  return jsonResponse({ category_pt, excluded });
}

export async function handleDailyCategoryExclusionPathPost(
  req: Request,
  url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const prefix = "/api/forecast/daily/exclusions/";
  const category_pt = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!category_pt) return errorResponse("category_pt é obrigatório", 400);

  let excluded = true;
  try {
    const body = await req.json() as { excluded?: unknown };
    if (typeof body.excluded === "boolean") excluded = body.excluded;
  } catch {
    // Sem body: POST no alias legado adiciona a exclusao.
  }

  await setCategoryExclusion(tenantId, sql, category_pt, excluded);
  return jsonResponse({ category_pt, excluded });
}

// ─── 4.8 POST /api/forecast/daily/daily-exclusions ──────────────────────────
export async function handleDailyExclusionsPost(
  req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("JSON inválido", 400);
  }

  const { transaction_date, category_pt, correction_tag, remove } = body as Record<string, unknown>;
  if (!transaction_date || typeof transaction_date !== "string") {
    return errorResponse("transaction_date é obrigatório (YYYY-MM-DD)", 400);
  }
  if (!category_pt || typeof category_pt !== "string") {
    return errorResponse("category_pt é obrigatório", 400);
  }

  const VALID_TAGS = ["Viagem", "Evento especial", "Mudança de hábito", "Outra situação atípica"];
  const tag = typeof correction_tag === "string" && VALID_TAGS.includes(correction_tag)
    ? correction_tag
    : null;

  await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    if (remove === true) {
      await tx`
        DELETE FROM forecast_daily_exclusions
        WHERE tenant_id = ${tenantId}::uuid
          AND transaction_date = ${transaction_date}::date
          AND category_pt = ${category_pt}
      `;
    } else {
      await tx`
        INSERT INTO forecast_daily_exclusions
          (tenant_id, transaction_date, category_pt, correction_tag)
        VALUES
          (${tenantId}::uuid, ${transaction_date}::date, ${category_pt}, ${tag})
        ON CONFLICT (tenant_id, transaction_date, category_pt) DO UPDATE
        SET correction_tag = EXCLUDED.correction_tag
      `;
    }
  });

  if (remove === true) return jsonResponse({ removed: true });
  return jsonResponse({ added: true, transaction_date, category_pt, correction_tag: tag });
}

// ─── 4.9 GET /api/forecast/daily/messages-range ─────────────────────────────
export async function handleDailyMessagesRange(
  req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const rows = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return tx`
      SELECT DISTINCT message_date::text AS message_date
      FROM forecast_ai_messages
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY message_date ASC
    `;
  });

  const dates = rows.map((r: any) => r.message_date);
  return jsonResponse({ dates });
}

// ─── 4.1 POST /api/forecast/daily/train ─────────────────────────────────────
