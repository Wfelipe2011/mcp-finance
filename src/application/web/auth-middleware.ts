import { jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env["APP_SECRET"];
  if (!secret) throw new Error("APP_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function verifyAuth(req: Request): Promise<{ valid: true; tenantId: string } | { valid: false; status: number }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, status: 401 };
  }

  const token = authHeader.slice(7);
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    const tenantId = payload.tenant_id as string | undefined;
    if (!tenantId) return { valid: false, status: 401 };
    return { valid: true, tenantId };
  } catch {
    return { valid: false, status: 401 };
  }
}

export async function requireSuperAdmin(req: Request): Promise<{ valid: true } | { valid: false; status: number }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, status: 401 };
  }

  const token = authHeader.slice(7);
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string | undefined;
    if (role !== "super_admin") return { valid: false, status: 403 };
    return { valid: true };
  } catch {
    return { valid: false, status: 401 };
  }
}

