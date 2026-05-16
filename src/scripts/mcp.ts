/**
 * MCP Finance Server — Streamable HTTP entrypoint
 * Exposes a catalog of 12 finance analysis tools + sync, all tenant-scoped.
 *
 * Transport: Web Standard Streamable HTTP (Bun-native, stateless per-request)
 * Default port: 3002 (override with MCP_PORT env var)
 * Bind: 127.0.0.1 (localhost only — never expose publicly)
 *
 * Stateless mode: a fresh McpServer + transport is created per POST request.
 * The shared SQL connection is passed in at registration time.
 */
import { SQL } from "bun";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerAllTools } from "../application/mcp/register-tools.ts";

const MCP_PORT = parseInt(process.env["MCP_PORT"] ?? "3002", 10);
const MCP_HOST = process.env["MCP_HOST"] ?? "127.0.0.1";

const dbUrl = process.env["DATABASE_URL"];
if (!dbUrl) throw new Error("DATABASE_URL is not set");

const sharedSql = new SQL(dbUrl);

process.on("SIGTERM", async () => { await sharedSql.close(); process.exit(0); });
process.on("SIGINT",  async () => { await sharedSql.close(); process.exit(0); });

/** Create a fresh McpServer and handle a single stateless MCP request */
async function handleMcpRequest(req: Request): Promise<Response> {
  const mcpServer = new McpServer(
    { name: "mcp-finance", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  registerAllTools(mcpServer, sharedSql);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await mcpServer.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    await mcpServer.server.close();
  }
}

// Start the Bun HTTP server
const server = Bun.serve({
  hostname: MCP_HOST,
  port: MCP_PORT,
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health" && req.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", service: "mcp-finance" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // MCP endpoint — handles GET (SSE keepalive), POST (tool calls), DELETE (session)
    if (url.pathname === "/mcp" || url.pathname === "/") {
      if (req.method === "POST" || req.method === "GET" || req.method === "DELETE") {
        return handleMcpRequest(req);
      }
      return new Response("Method Not Allowed", { status: 405 });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`[mcp-finance] Server listening on http://${server.hostname}:${server.port}/mcp`);

