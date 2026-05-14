import { serveStatic } from "./static.ts";
import { router } from "./router.ts";

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
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Route API requests
    if (url.pathname.startsWith("/api/")) {
      return router(req, url);
    }

    // Serve static files (SPA fallback)
    return serveStatic(url);
  },
});

console.log(`Web server running on http://localhost:${server.port}`);
