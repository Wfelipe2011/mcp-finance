import { SQL } from "bun";
import { existsSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { errorResponse, jsonResponse } from "../../helpers.ts";

const MODEL_STORAGE_PATH = process.env["MODEL_STORAGE_PATH"] ?? "/models";

// ─── 4.1 POST /api/forecast/daily/train ─────────────────────────────────────
export async function handleDailyTrain(
  req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const now = new Date();
  const versionName = `daily-v${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

  // Criar arquivo sentinel para trigger o treinamento no container ml-daily-trainer
  const { mkdirSync, writeFileSync } = await import("fs");
  const tenantModelDir = join(MODEL_STORAGE_PATH, tenantId);
  try {
    mkdirSync(tenantModelDir, { recursive: true });
    writeFileSync(join(tenantModelDir, ".trigger"), new Date().toISOString());
  } catch (err) {
    // volume pode não estar montado em dev — log e continua
    console.warn("[daily-train] sentinel write failed:", err);
  }

  return jsonResponse({ version_name: versionName, status: "queued" });
}

// ─── 4.2 GET /api/forecast/daily/model-versions ─────────────────────────────
export async function handleDailyModelVersions(
  req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const rows: any[] = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return tx`
      SELECT
        id, version_name, file_path, status,
        mae, mape, accuracy_pct,
        num_train, num_test,
        exclusions_applied,
        created_at, activated_at, archived_at
      FROM forecast_model_versions
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;
  });

  const versions = rows.map((row: any) => {
    let file_size_bytes: number | null = null;
    if (row.file_path) {
      try {
        file_size_bytes = statSync(row.file_path).size;
      } catch {
        file_size_bytes = null;
      }
    }
    return { ...row, file_size_bytes };
  });

  return jsonResponse(versions);
}

// ─── 4.3 GET /api/forecast/daily/test-results?version=<name> ────────────────
export async function handleDailyTestResults(
  req: Request,
  url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const version = url.searchParams.get("version");
  if (!version) {
    return errorResponse("Parâmetro 'version' é obrigatório", 400);
  }

  const rows = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return tx`
      SELECT
        id, version_name, transaction_date, category_pt, group_pt,
        predicted_amount, actual_amount, deviation_pct
      FROM forecast_daily_test_results
      WHERE tenant_id = ${tenantId}::uuid
        AND version_name = ${version}
      ORDER BY ABS(deviation_pct) DESC
    `;
  });

  return jsonResponse(rows);
}

// ─── 4.4 POST /api/forecast/daily/activate ──────────────────────────────────
export async function handleDailyActivate(
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

  const { version_name } = body as Record<string, unknown>;
  if (!version_name || typeof version_name !== "string") {
    return errorResponse("version_name é obrigatório", 400);
  }

  const result: { activated?: string; error?: string; status?: number } = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

    const rows = await tx`
      SELECT id, status FROM forecast_model_versions
      WHERE tenant_id = ${tenantId}::uuid AND version_name = ${version_name}
    `;

    if (rows.length === 0) return { error: "Versão não encontrada", status: 404 };

    const ver = rows[0] as any;
    if (ver.status === "production") return { error: "Versão já está em produção", status: 409 };
    if (ver.status === "archived") return { error: "Versão arquivada não pode ser ativada", status: 409 };

    await tx`
      UPDATE forecast_model_versions
      SET status = 'archived', archived_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND status = 'production'
    `;
    await tx`
      UPDATE forecast_model_versions
      SET status = 'production', activated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND version_name = ${version_name}
    `;

    return { activated: version_name };
  });

  if (result.error) return errorResponse(result.error, result.status ?? 400);
  return jsonResponse(result);
}

// ─── 4.5 DELETE /api/forecast/daily/model-file ──────────────────────────────
export async function handleDailyDeleteModelFile(
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

  const { version_name } = body as Record<string, unknown>;
  if (!version_name || typeof version_name !== "string") {
    return errorResponse("version_name é obrigatório", 400);
  }

  const result: { deleted?: string; filePath?: string | null; error?: string; status?: number } = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

    const rows = await tx`
      SELECT status, file_path FROM forecast_model_versions
      WHERE tenant_id = ${tenantId}::uuid AND version_name = ${version_name}
    `;
    if (rows.length === 0) return { error: "Versão não encontrada", status: 404 };

    const ver = rows[0] as any;
    if (ver.status === "production") return { error: "Arquive o modelo antes de deletar o arquivo", status: 409 };

    await tx`
      UPDATE forecast_model_versions SET file_path = NULL
      WHERE tenant_id = ${tenantId}::uuid AND version_name = ${version_name}
    `;
    return { deleted: version_name as string, filePath: ver.file_path };
  });

  if (result.error) return errorResponse(result.error, result.status ?? 400);

  if (result.filePath) {
    try {
      if (existsSync(result.filePath)) unlinkSync(result.filePath);
    } catch (err) {
      console.warn("[delete-model-file] unlink failed:", err);
    }
  }

  return jsonResponse({ deleted: result.deleted });
}

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
