import type { SQL } from "bun";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFinancialBaseTools } from "./tools/financial-base.ts";
import { registerFinancialAdvancedTools } from "./tools/financial-advanced.ts";
import { registerAiMlOpsTools } from "./tools/ai-ml-ops.ts";
import { registerSyncTool } from "./tools/sync-tool.ts";

/** Register all 12 analytics tools + sync onto the MCP server */
export function registerAllTools(server: McpServer, sql: SQL): void {
  registerFinancialBaseTools(server, sql);
  registerFinancialAdvancedTools(server, sql);
  registerAiMlOpsTools(server, sql);
  registerSyncTool(server, sql);
}
