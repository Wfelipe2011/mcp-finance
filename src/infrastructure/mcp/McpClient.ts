/**
 * Cliente MCP com agente LangChain para o chat financeiro.
 *
 * ## Fluxo
 *
 *   processarMensagemDoChat(msg, { tenantId, userId, role })
 *     → getAgentSingleton({ role })        — lazy init por role (cached)
 *       → MultiServerMCPClient.getTools()  — conexão lazy ao MCP (:3002)
 *       → filterToolsByRole                — exclui tools admin para member
 *       → buildWrappedTools                — wrapper injeta tenant_id autenticado
 *       → createAgent(llm, tools, stateSchema, checkpointer, middleware)
 *     → agent.invoke({ messages, tenantId, userRole }, { thread_id })
 *     ← string de resposta do LLM
 *
 * ## Segurança
 *   O tenant_id é injetado a partir do estado autenticado (JWT), nunca do LLM.
 *   Cada wrapper de tool sobrescreve qualquer valor que o LLM tente passar.
 *
 * ## Memória
 *   thread_id = `${tenantId}:${userId}` — conversa contínua por usuário.
 *   MemorySaver em desenvolvimento; PostgresSaver em produção (NODE_ENV=production).
 *
 * Configuração via variáveis de ambiente:
 *   MCP_BASE_URL       — URL do servidor MCP (padrão: http://mcp-server:3002/mcp)
 *   OPENROUTER_MODEL   — Modelo LLM (padrão: deepseek/deepseek-chat)
 *   OPENROUTER_API_KEY — API key do OpenRouter
 *   DATABASE_URL       — Postgres para PostgresSaver (somente NODE_ENV=production)
 */

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenRouter } from "@langchain/openrouter";
import { createAgent, createMiddleware, summarizationMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { z } from "zod";

// ─── Erros de domínio (mantidos para compatibilidade com o handler de chat) ───

export class McpTimeoutError extends Error {
  constructor(toolName: string, timeoutMs: number) {
    super(`Timeout ao chamar tool "${toolName}" após ${timeoutMs}ms`);
    this.name = "McpTimeoutError";
  }
}

export class McpParseError extends Error {
  constructor(toolName: string, detail: string) {
    super(`Resposta inválida do MCP para tool "${toolName}": ${detail}`);
    this.name = "McpParseError";
  }
}

export class McpToolError extends Error {
  constructor(toolName: string, message: string) {
    super(`Erro retornado pela tool MCP "${toolName}": ${message}`);
    this.name = "McpToolError";
  }
}

// ─── Role de usuário ──────────────────────────────────────────────────────────

export type AgentUserRole = "member" | "admin";

// ─── Schema de estado do agente ───────────────────────────────────────────────

/** Estado autenticado injetado em cada invocação do agente */
const CustomStateSchema = z.object({
  tenantId: z.string(),
  userRole: z.enum(["member", "admin"]),
});

type TenantCarrier = {
  tenantId?: unknown;
  userRole?: unknown;
};

type ToolRuntimeConfig = {
  state?: TenantCarrier;
  context?: TenantCarrier;
  configurable?: TenantCarrier;
};

type JsonSchemaObject = Record<string, unknown> & {
  properties?: Record<string, unknown>;
  required?: unknown[];
};

function normalizeTenantId(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function resolveAuthenticatedTenantId(config: unknown): string {
  const runtimeConfig = config as ToolRuntimeConfig | undefined;
  const tenantId =
    normalizeTenantId(runtimeConfig?.state?.tenantId) ??
    normalizeTenantId(runtimeConfig?.context?.tenantId) ??
    normalizeTenantId(runtimeConfig?.configurable?.tenantId);

  if (!tenantId) {
    throw new Error("Tenant autenticado ausente na chamada MCP");
  }

  return tenantId;
}

function isJsonSchemaObject(schema: unknown): schema is JsonSchemaObject {
  return typeof schema === "object" && schema !== null && !(schema instanceof z.ZodType);
}

function removeTenantIdFromSchema(schema: unknown): unknown {
  if (schema instanceof z.ZodObject) {
    return schema.omit({ tenant_id: true });
  }

  if (!isJsonSchemaObject(schema)) return schema;

  const properties = schema.properties ? { ...schema.properties } : undefined;
  if (!properties || !("tenant_id" in properties)) return schema;

  delete properties["tenant_id"];

  const required = Array.isArray(schema.required)
    ? schema.required.filter((field) => field !== "tenant_id")
    : schema.required;

  return {
    ...schema,
    properties,
    required,
  };
}

// ─── Filtro de tools por role ─────────────────────────────────────────────────

/** Tools que só devem ser expostas a usuários admin */
const ADMIN_ONLY_TOOLS = new Set(["get_pipeline_health", "get_sync_status"]);

/**
 * Filtra a lista de tools MCP com base no role do usuário.
 * Usuários `member` não veem tools administrativas.
 */
export function filterToolsByRole(
  tools: DynamicStructuredTool[],
  role: AgentUserRole,
): DynamicStructuredTool[] {
  if (role === "admin") return tools;
  return tools.filter((t) => !ADMIN_ONLY_TOOLS.has(t.name));
}

// ─── Wrapper de segurança para tools ─────────────────────────────────────────

/**
 * Envolve cada tool MCP com um wrapper que injeta `tenant_id` do estado
 * autenticado do agente antes de chamar o servidor MCP.
 * Sobrescreve qualquer valor de `tenant_id` que o LLM tente fornecer.
 */
export function buildWrappedTools(
  rawTools: DynamicStructuredTool[],
): DynamicStructuredTool[] {
  return rawTools.map((rawTool) => {
    const originalFunc = rawTool.func.bind(rawTool);
    return new DynamicStructuredTool({
      name: rawTool.name,
      description: `${rawTool.description}\nParâmetros autenticados como tenant_id são preenchidos pelo backend; nunca peça tenant_id ou UUID ao usuário.`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: removeTenantIdFromSchema(rawTool.schema) as any,
      func: async (
        args: Record<string, unknown>,
        runManager?: unknown,
        config?: unknown,
      ) => {
        const tenantId = resolveAuthenticatedTenantId(config);
        const safeArgs = { ...args, tenant_id: tenantId };
        console.log(`[MCP] tool="${rawTool.name}" tenant=authenticated`);
        return await originalFunc(
          safeArgs,
          runManager as never,
          config as never,
        );
      },
    });
  });
}

const tenantToolSecurityMiddleware = createMiddleware({
  name: "TenantToolSecurityMiddleware",
  stateSchema: CustomStateSchema,
  wrapToolCall: async (request, handler) => {
    const tenantId =
      normalizeTenantId(request.state.tenantId) ??
      normalizeTenantId((request.runtime.context as TenantCarrier | undefined)?.tenantId) ??
      normalizeTenantId((request.runtime.configurable as TenantCarrier | undefined)?.tenantId);

    if (!tenantId) {
      throw new Error("Tenant autenticado ausente na chamada MCP");
    }

    return handler({
      ...request,
      toolCall: {
        ...request.toolCall,
        args: {
          ...(request.toolCall.args as Record<string, unknown>),
          tenant_id: tenantId,
        },
      },
    });
  },
});

// ─── Checkpointer ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let checkpointerInstance: any | null = null;

/**
 * Retorna `PostgresSaver` em produção (NODE_ENV=production),
 * `MemorySaver` em desenvolvimento. Singleton.
 */
export function createCheckpointer() {
  if (checkpointerInstance) return checkpointerInstance;
  if (process.env["NODE_ENV"] === "production") {
    const dbUrl =
      process.env["DATABASE_URL"] ??
      "postgres://finance:finance@localhost:5434/finance";
    checkpointerInstance = PostgresSaver.fromConnString(dbUrl);
  } else {
    checkpointerInstance = new MemorySaver();
  }
  return checkpointerInstance;
}

/**
 * Inicializa o checkpointer (cria tabelas LangGraph no Postgres se necessário).
 * Deve ser chamado no boot da API, antes de aceitar requisições de chat.
 * Erros são logados mas não derrubam a API.
 */
export async function setupCheckpointer(): Promise<void> {
  try {
    const cp = createCheckpointer();
    if (typeof cp.setup === "function") {
      await cp.setup();
      console.log("[checkpointer] Setup concluído");
    }
  } catch (err) {
    console.error("[checkpointer] Falha no setup (continuando):", err);
  }
}

// ─── LLM ──────────────────────────────────────────────────────────────────────

function createLlm() {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurado");
  }

  return new ChatOpenRouter({
    model: process.env["OPENROUTER_MODEL"] ?? "deepseek/deepseek-chat",
    apiKey,
    temperature: 0,
  });
}

// ─── MCP Client singleton ─────────────────────────────────────────────────────

let mcpClientInstance: MultiServerMCPClient | null = null;

function getMcpClient(): MultiServerMCPClient {
  if (mcpClientInstance) return mcpClientInstance;
  const mcpUrl =
    process.env["MCP_BASE_URL"] ?? "http://mcp-server:3002/mcp";
  mcpClientInstance = new MultiServerMCPClient({
    mcpServer: {
      url: mcpUrl,
      transport: "http",
    },
  });
  return mcpClientInstance;
}

// ─── Agent singleton por role ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agentCache = new Map<AgentUserRole, any>();

/**
 * Retorna (ou cria) o agente LangChain para o role especificado.
 * Inicialização é lazy — ocorre na primeira requisição de chat.
 * Cache por role: member e admin têm conjuntos de tools diferentes.
 */
async function getAgentSingleton({
  role,
}: {
  role: AgentUserRole;
}) {
  if (agentCache.has(role)) return agentCache.get(role)!;

  const mcpClient = getMcpClient();
  const rawTools = await mcpClient.getTools();
  const filteredTools = filterToolsByRole(rawTools, role);
  const wrappedTools = buildWrappedTools(filteredTools);

  const llm = createLlm();
  const checkpointer = createCheckpointer();

  const agent = createAgent({
    model: llm,
    tools: wrappedTools,
    stateSchema: CustomStateSchema,
    checkpointer,
    middleware: [
      tenantToolSecurityMiddleware,
      summarizationMiddleware({
        model: llm,
        trigger: { tokens: 4000 },
        keep: { messages: 20 },
      }),
    ],
    systemPrompt: [
      "Você é um assistente financeiro pessoal.",
      "Responda SEMPRE em português, de forma curta e direta (no máximo 3 frases).",
      "Use as tools financeiras disponíveis quando precisar consultar saldos, gastos, cartões, previsões, assinaturas ou transações.",
      "O tenant_id é autenticado e injetado pelo backend; nunca peça, mencione ou aceite tenant_id/UUID do usuário.",
      "Se faltar uma data, use o período mais natural da pergunta; para 'este mês' ou 'mês atual', use o mês corrente.",
      "Não use saudações nem conclusões genéricas. Quando não souber a resposta, diga isso de forma simples.",
    ].join(" "),
  });

  agentCache.set(role, agent);
  return agent;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Processa uma mensagem de chat com isolamento por tenant e role.
 *
 * @param mensagemDoUsuario  Texto da mensagem do usuário.
 * @param tenantId           UUID do tenant autenticado (do JWT).
 * @param userId             ID do usuário autenticado (campo `sub` do JWT).
 * @param role               Role do usuário (`member` | `admin`).
 * @returns                  Resposta do LLM em pt-BR.
 */
export async function processarMensagemDoChat(
  mensagemDoUsuario: string,
  {
    tenantId,
    userId,
    role,
  }: { tenantId: string; userId: string; role: AgentUserRole },
): Promise<string> {
  console.log("[Backend] Consultando o LLM...");

  const agent = await getAgentSingleton({ role });
  const threadId = `${tenantId}:${userId}`;

  const result = await agent.invoke(
    {
      messages: [new HumanMessage(mensagemDoUsuario)],
      tenantId,
      userRole: role,
    },
    {
      configurable: { thread_id: threadId, tenantId, userRole: role },
      context: { tenantId, userRole: role },
    },
  );

  const lastMessage = result.messages?.at(-1);
  const content = lastMessage?.content;
  return typeof content === "string"
    ? content
    : JSON.stringify(content ?? "Erro ao processar a mensagem.");
}
