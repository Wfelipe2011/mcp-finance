import { SQL } from "bun";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";

const TTL_DAYS = parseInt(process.env["AUTH_TOKEN_TTL_DAYS"] ?? "30", 10);

function getSecret(): Uint8Array {
  const secret = process.env["APP_SECRET"];
  if (!secret) throw new Error("APP_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function handleLogin(req: Request): Promise<Response> {
  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { email, password } = body;
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "email e password são obrigatórios" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = new SQL(url);
  try {
    const rows = await sql<{ id: string; name: string; password_hash: string; status: string }[]>`
      SELECT id, name, password_hash, status FROM tenants WHERE email = ${email} LIMIT 1
    `;
    const tenant = rows[0];

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (tenant.status !== "active") {
      return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const match = await compare(password, tenant.password_hash);
    if (!match) {
      return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    await sql`UPDATE tenants SET last_login_at = NOW() WHERE id = ${tenant.id}`;

    const secret = getSecret();
    const token = await new SignJWT({ sub: email, tenant_id: tenant.id, tenant_name: tenant.name })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${TTL_DAYS}d`)
      .sign(secret);

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await sql.close();
  }
}

