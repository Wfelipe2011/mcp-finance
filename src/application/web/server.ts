import { SQL } from "bun";
import { serveStatic } from "./static.ts";
import { router } from "./router.ts";
import { verifyAuth } from "./auth-middleware.ts";

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);

async function tenantExists(tenantId: string): Promise<boolean> {
  const url = process.env["DATABASE_URL"];
  if (!url) return false;
  const sql = new SQL(url);
  try {
    const rows = await sql<{ id: string }[]>`SELECT id FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1`;
    return rows.length > 0;
  } finally {
    await sql.close();
  }
}

const server = Bun.serve({
  port: PORT,
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
      return router(req, url, "");
    }

    // Route API requests
    if (url.pathname.startsWith("/api/")) {
      // Public endpoints (no tenant auth required)
      if (url.pathname === "/api/auth/login" || url.pathname === "/api/admin/login") {
        return router(req, url, "");
      }
      // Admin endpoints use their own auth (requireSuperAdmin)
      if (url.pathname.startsWith("/api/admin/")) {
        return router(req, url, "");
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
      return router(req, url, auth.tenantId);
    }

    // Serve static files (SPA fallback)
    return serveStatic(url);
  },
});

console.log(`Web server running on http://localhost:${server.port}`);
