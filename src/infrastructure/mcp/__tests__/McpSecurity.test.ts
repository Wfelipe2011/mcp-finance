/**
 * Testes unitários para segurança do McpClient:
 *  - filterToolsByRole: exclusão de tools admin-only para role member
 *  - buildWrappedTools: sobrescrita de tenant_id com valor do estado autenticado
 *
 * Run: bun test src/infrastructure/mcp/__tests__/McpSecurity.test.ts
 */
import { describe, it, expect, mock } from "bun:test";
import { DynamicStructuredTool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { z } from "zod";
import { filterToolsByRole, buildWrappedTools } from "../McpClient.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTool(name: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name,
    description: `Tool ${name}`,
    schema: z.object({
      tenant_id: z.string().optional(),
      value: z.string().optional(),
    }),
    func: async (args) => JSON.stringify(args),
  });
}

// ---------------------------------------------------------------------------
// filterToolsByRole
// ---------------------------------------------------------------------------

describe("filterToolsByRole", () => {
  const allTools = [
    makeTool("get_monthly_balance"),
    makeTool("get_subscription_analysis"),
    makeTool("get_pipeline_health"),  // admin-only
    makeTool("get_sync_status"),       // admin-only
    makeTool("get_credit_card_status"),
  ];

  it("exclui tools admin-only para usuários member", () => {
    const result = filterToolsByRole(allTools, "member");
    const names = result.map((t) => t.name);
    expect(names).not.toContain("get_pipeline_health");
    expect(names).not.toContain("get_sync_status");
  });

  it("mantém tools não-admin para usuários member", () => {
    const result = filterToolsByRole(allTools, "member");
    const names = result.map((t) => t.name);
    expect(names).toContain("get_monthly_balance");
    expect(names).toContain("get_subscription_analysis");
    expect(names).toContain("get_credit_card_status");
  });

  it("retorna todas as tools para usuários admin", () => {
    const result = filterToolsByRole(allTools, "admin");
    expect(result).toHaveLength(allTools.length);
  });

  it("tools admin-only estão presentes para role admin", () => {
    const result = filterToolsByRole(allTools, "admin");
    const names = result.map((t) => t.name);
    expect(names).toContain("get_pipeline_health");
    expect(names).toContain("get_sync_status");
  });

  it("retorna array vazio quando não há tools permitidas", () => {
    const onlyAdmin = [makeTool("get_pipeline_health"), makeTool("get_sync_status")];
    const result = filterToolsByRole(onlyAdmin, "member");
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildWrappedTools — injeta tenant_id do estado autenticado
// ---------------------------------------------------------------------------

describe("buildWrappedTools", () => {
  it("preserva nome e descrição da tool original", () => {
    const raw = [makeTool("get_monthly_balance")];
    const wrapped = buildWrappedTools(raw);
    expect(wrapped[0]!.name).toBe("get_monthly_balance");
    expect(wrapped[0]!.description).toContain("get_monthly_balance");
  });

  it("remove tenant_id do schema JSON exposto ao LLM", () => {
    const raw = new DynamicStructuredTool({
      name: "json_schema_tool",
      description: "json schema tool",
      schema: {
        type: "object",
        properties: {
          tenant_id: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
        },
        required: ["tenant_id", "start_date", "end_date"],
      } as any,
      func: async (args) => JSON.stringify(args),
    });

    const [wrapped] = buildWrappedTools([raw]);
    const schema = wrapped!.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };

    expect(schema.properties["tenant_id"]).toBeUndefined();
    expect(schema.properties["start_date"]).toBeDefined();
    expect(schema.required).not.toContain("tenant_id");
    expect(schema.required).toContain("start_date");
  });

  it("remove tenant_id do schema Zod exposto ao LLM", () => {
    const [wrapped] = buildWrappedTools([makeTool("zod_tool")]);
    const schema = wrapped!.schema as z.ZodObject<{ value: z.ZodOptional<z.ZodString> }>;

    expect(schema.safeParse({ value: "x" }).success).toBe(true);
    expect(Object.keys(schema.shape)).not.toContain("tenant_id");
  });

  it("sobrescreve tenant_id fornecido pelo LLM com o valor do estado autenticado", async () => {
    const capturedArgs: Record<string, unknown>[] = [];
    const spyTool = new DynamicStructuredTool({
      name: "spy_tool",
      description: "spy",
      schema: z.object({
        tenant_id: z.string().optional(),
        valor: z.string().optional(),
      }),
      func: async (args) => {
        capturedArgs.push(args);
        return "ok";
      },
    });

    const [wrapped] = buildWrappedTools([spyTool]);

    // Simula LangGraphRunnableConfig com state.tenantId autenticado
    const fakeConfig = { state: { tenantId: "tenant-autenticado" } } as unknown as RunnableConfig;

    // O LLM tenta passar tenant_id diferente — deve ser sobrescrito
    await wrapped!.func(
      { tenant_id: "tenant-malicioso-do-llm", valor: "x" },
      undefined,
      fakeConfig,
    );

    expect(capturedArgs[0]).toBeDefined();
    expect(capturedArgs[0]!.tenant_id).toBe("tenant-autenticado");
    expect(capturedArgs[0]!.tenant_id).not.toBe("tenant-malicioso-do-llm");
  });

  it("injeta tenant_id mesmo quando o LLM não o fornece", async () => {
    const capturedArgs: Record<string, unknown>[] = [];
    const spyTool = new DynamicStructuredTool({
      name: "spy_tool2",
      description: "spy",
      schema: z.object({
        tenant_id: z.string().optional(),
      }),
      func: async (args) => {
        capturedArgs.push(args);
        return "ok";
      },
    });

    const [wrapped] = buildWrappedTools([spyTool]);
    const fakeConfig = { state: { tenantId: "tenant-correto" } } as unknown as RunnableConfig;

    // LLM não fornece tenant_id nos args
    await wrapped!.func({}, undefined, fakeConfig);

    expect(capturedArgs[0]?.tenant_id).toBe("tenant-correto");
  });

  it("também aceita tenantId vindo de config.configurable autenticado", async () => {
    const capturedArgs: Record<string, unknown>[] = [];
    const spyTool = new DynamicStructuredTool({
      name: "spy_tool3",
      description: "spy",
      schema: z.object({ tenant_id: z.string().optional() }),
      func: async (args) => {
        capturedArgs.push(args);
        return "ok";
      },
    });

    const [wrapped] = buildWrappedTools([spyTool]);
    const fakeConfig = { configurable: { tenantId: "tenant-config" } } as unknown as RunnableConfig;

    await wrapped!.func({ tenant_id: "llm-value" }, undefined, fakeConfig);

    expect(capturedArgs[0]?.tenant_id).toBe("tenant-config");
  });

  it("falha fechado quando não há tenant autenticado no runtime", async () => {
    const spyTool = new DynamicStructuredTool({
      name: "spy_tool4",
      description: "spy",
      schema: z.object({ tenant_id: z.string().optional() }),
      func: async () => "ok",
    });

    const [wrapped] = buildWrappedTools([spyTool]);

    // Sem state (não está em um agente LangGraph)
    await expect(wrapped!.func({ tenant_id: "llm-value" }, undefined, undefined)).rejects.toThrow(
      "Tenant autenticado ausente",
    );
  });

  it("retorna array com mesmo número de tools que a entrada", () => {
    const tools = [makeTool("a"), makeTool("b"), makeTool("c")];
    const wrapped = buildWrappedTools(tools);
    expect(wrapped).toHaveLength(3);
  });
});
