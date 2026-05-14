import { serveStatic } from "./static.ts";
import { router } from "./router.ts";
import { verifyAuth } from "./auth-middleware.ts";

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);

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

    // Route API requests
    if (url.pathname.startsWith("/api/")) {
      // Auth endpoint is public
      if (url.pathname !== "/api/auth/login") {
        const auth = await verifyAuth(req);
        if (!auth.valid) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      return router(req, url);
    }

    // Serve static files (SPA fallback)
    return serveStatic(url);
  },
});

console.log(`Web server running on http://localhost:${server.port}`);
