import { jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env["APP_SECRET"];
  if (!secret) throw new Error("APP_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function verifyAuth(req: Request): Promise<{ valid: true } | { valid: false; status: number }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, status: 401 };
  }

  const token = authHeader.slice(7);
  try {
    const secret = getSecret();
    await jwtVerify(token, secret);
    return { valid: true };
  } catch {
    return { valid: false, status: 401 };
  }
}
