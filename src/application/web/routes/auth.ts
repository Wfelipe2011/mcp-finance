import { timingSafeEqual, createHmac } from "node:crypto";
import { SignJWT } from "jose";

const TTL_DAYS = parseInt(process.env["AUTH_TOKEN_TTL_DAYS"] ?? "30", 10);

function getSecret(): Uint8Array {
  const secret = process.env["APP_SECRET"];
  if (!secret) throw new Error("APP_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function handleLogin(req: Request): Promise<Response> {
  let body: { username?: string; password?: string };
  try {
    body = (await req.json()) as { username?: string; password?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { username, password } = body;

  const expectedUser = process.env["APP_USERNAME"] ?? "";
  const expectedPass = process.env["APP_PASSWORD"] ?? "";

  if (!expectedUser || !expectedPass) {
    return new Response(
      JSON.stringify({ error: "APP_USERNAME e APP_PASSWORD devem estar configurados" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const userBuf = Buffer.from(username ?? "");
  const expectedUserBuf = Buffer.from(expectedUser);
  const passBuf = Buffer.from(password ?? "");
  const expectedPassBuf = Buffer.from(expectedPass);

  // Timing-safe comparison (pad to same length to avoid length leaks)
  const userLen = Math.max(userBuf.length, expectedUserBuf.length);
  const passLen = Math.max(passBuf.length, expectedPassBuf.length);

  const userMatch = timingSafeEqual(
    Buffer.concat([userBuf], userLen),
    Buffer.concat([expectedUserBuf], userLen)
  );
  const passMatch = timingSafeEqual(
    Buffer.concat([passBuf], passLen),
    Buffer.concat([expectedPassBuf], passLen)
  );

  if (!userMatch || !passMatch) {
    return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secret = getSecret();
  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(secret);

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
