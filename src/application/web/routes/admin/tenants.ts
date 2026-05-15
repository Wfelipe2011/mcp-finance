import { hash } from "bcryptjs";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { requireSuperAdmin } from "../../auth-middleware.ts";
import { jsonResponse, errorResponse } from "../../helpers.ts";

const ALLOWED_STATUSES = new Set(["active", "suspended", "inactive"]);

function normalizeStatus(status: string): string {
  return status === "inactive" ? "suspended" : status;
}

export async function handleListTenants(req: Request): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter();
  const tenants = await db.tenants.findAll();
  return jsonResponse(tenants);
}

export async function handleCreateTenant(req: Request): Promise<Response> {
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
    return errorResponse("name, email e password são obrigatórios", 400);
  }

  const password_hash = await hash(password, 10);

  const db = new BunPgAdapter();
  try {
    const tenant = await db.tenants.create({
      name,
      email,
      password_hash,
      pluggy_email: pluggy_email ?? null,
      pluggy_password: pluggy_password ?? null,
    });
    return jsonResponse(tenant, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("tenants_email_key") || msg.includes("unique")) {
      return errorResponse("Email já cadastrado", 409);
    }
    throw err;
  }
}

export async function handleToggleTenantStatus(req: Request, url: URL): Promise<Response> {
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
  if (!ALLOWED_STATUSES.has(rawStatus)) {
    return errorResponse("Status inválido", 400);
  }

  const status = normalizeStatus(rawStatus);
  const db = new BunPgAdapter();
  const tenant = await db.tenants.setStatus(id, status);
  if (!tenant) return errorResponse("Tenant não encontrado", 404);

  return jsonResponse(tenant);
}
