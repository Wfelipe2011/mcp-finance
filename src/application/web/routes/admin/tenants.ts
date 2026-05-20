import { SQL } from "bun";
import { hash } from "bcryptjs";
import { BunPgAdapter, type TenantRow } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { requireSuperAdmin } from "../../auth-middleware.ts";
import { jsonResponse, errorResponse } from "../../helpers.ts";

const ALLOWED_INPUT_STATUSES = new Set(["active", "inactive"]);

function normalizeStatusForDb(status: string): string {
  return status === "inactive" ? "suspended" : status;
}

function normalizeStatusForResponse(status: string): string {
  return status === "suspended" ? "inactive" : status;
}

function normalizeTenantResponse(tenant: TenantRow): TenantRow {
  return { ...tenant, status: normalizeStatusForResponse(tenant.status as string) };
}

export async function handleListTenants(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const tenants = await db.tenants.findAll();
  return jsonResponse(tenants.map(normalizeTenantResponse));
}

export async function handleCreateTenant(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  let body: {
    name?: string;
    email?: string;
    password?: string;
    pluggy_email?: string | null;
    pluggy_password?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const { name, email, password, pluggy_email, pluggy_password } = body;
  if (!name || !email || !password) {
    return errorResponse("Campos obrigatórios: name, email, password", 400);
  }

  const password_hash = await hash(password, 10);

  const db = new BunPgAdapter(undefined, sql);
  try {
    const tenant = await db.tenants.create({
      name,
      email,
      password_hash,
      pluggy_email: pluggy_email?.trim() || null,
      pluggy_password: pluggy_password?.trim() || null,
    });
    return jsonResponse(normalizeTenantResponse(tenant), 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("tenants_email_key") || msg.includes("unique")) {
      return errorResponse("Email já cadastrado", 409);
    }
    throw err;
  }
}

export async function handleToggleTenantStatus(req: Request, url: URL, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const id = url.pathname.split("/").at(-1);
  if (!id) return errorResponse("ID obrigatório", 400);

  let body: { status?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const rawStatus = body.status ?? "";
  if (!ALLOWED_INPUT_STATUSES.has(rawStatus)) {
    return errorResponse("Status deve ser active ou inactive", 400);
  }

  const status = normalizeStatusForDb(rawStatus);
  const db = new BunPgAdapter(undefined, sql);
  const tenant = await db.tenants.setStatus(id, status);
  if (!tenant) return errorResponse("Tenant não encontrado", 404);

  return jsonResponse(normalizeTenantResponse(tenant));
}
