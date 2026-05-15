import { SignJWT } from "jose";

const TTL_DAYS = 7;

function getSecret(): Uint8Array {
  const secret = process.env["APP_SECRET"];
  if (!secret) throw new Error("APP_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function handleAdminLogin(req: Request): Promise<Response> {
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

  const adminEmail = process.env["SUPER_ADMIN_EMAIL"];
  const adminPassword = process.env["SUPER_ADMIN_PASSWORD"];

  if (!adminEmail || !adminPassword) {
    return new Response(JSON.stringify({ error: "Super admin não configurado" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Timing-safe string comparison (prevents timing attacks)
  function timingSafeEqual(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const ab = encoder.encode(a);
    const bb = encoder.encode(b);
    let diff = ab.length ^ bb.length;
    const len = Math.min(ab.length, bb.length);
    for (let i = 0; i < len; i++) diff |= (ab[i]! ^ bb[i]!);
    return diff === 0;
  }

  const emailMatch = timingSafeEqual(email, adminEmail);
  const passwordMatch = timingSafeEqual(password, adminPassword);

  if (!emailMatch || !passwordMatch) {
    return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secret = getSecret();
  const token = await new SignJWT({ sub: email, role: "super_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(secret);

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
