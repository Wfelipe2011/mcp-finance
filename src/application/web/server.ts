import { SQL } from "bun";
import { serveStatic } from "./static.ts";
import { router } from "./router.ts";
import { verifyAuth } from "./auth-middleware.ts";
import { setupCheckpointer } from "../../infrastructure/mcp/McpClient.ts";

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);

const dbUrl = process.env["DATABASE_URL"];
if (!dbUrl) throw new Error("DATABASE_URL is not set");
const sharedSql = new SQL(dbUrl);

process.on("SIGTERM", async () => { await sharedSql.close(); process.exit(0); });
process.on("SIGINT",  async () => { await sharedSql.close(); process.exit(0); });

// Inicializa checkpointer antes de aceitar requisições de chat
// (cria tabelas LangGraph no Postgres em produção; no-op em desenvolvimento)
await setupCheckpointer();

async function tenantExists(tenantId: string): Promise<boolean> {
  try {
    const rows = await sharedSql<{ id: string }[]>`SELECT id FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

const server = Bun.serve({
  port: PORT,
  idleTimeout: 30,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Admin panel (no auth required — JS handles it client-side)
    if (url.pathname === "/admin" && req.method === "GET") {
      return router(req, url, "", "", "member", sharedSql);
    }

    // Route API requests
    if (url.pathname.startsWith("/api/")) {
      // Public endpoints (no tenant auth required)
      if (url.pathname === "/api/auth/login" || url.pathname === "/api/admin/login") {
        return router(req, url, "", "", "member", sharedSql);
      }
      // Admin endpoints use their own auth (requireSuperAdmin)
      if (url.pathname.startsWith("/api/admin/")) {
        return router(req, url, "", "", "member", sharedSql);
      }
      const auth = await verifyAuth(req);
      if (!auth.valid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Verify tenant still exists in DB (handles revoked/deleted tenants)
      if (!await tenantExists(auth.tenantId)) {
        return new Response(JSON.stringify({ error: "Tenant não encontrado" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return router(req, url, auth.tenantId, auth.userId, auth.role, sharedSql);
    }

    // Serve static files (SPA fallback)
    return serveStatic(url);
  },
});

console.log(`Web server running on http://localhost:${server.port}`);
