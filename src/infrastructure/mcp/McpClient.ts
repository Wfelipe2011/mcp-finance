import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  SystemMessage,
} from "@langchain/core/messages";

import { ChatOpenRouter } from "@langchain/openrouter";
import { createAgent } from "langchain";

import { MemorySaver, StateGraph } from "@langchain/langgraph";

/**
 * Cliente HTTP para comunicação com o servidor MCP interno (porta 3002).
 * Encapsula o protocolo JSON-RPC 2.0 para chamadas de `tools/call`.
 *
 * Configuração via variáveis de ambiente:
 *   MCP_BASE_URL   — URL do endpoint MCP (padrão: http://127.0.0.1:3002/mcp)
 *   MCP_TIMEOUT_MS — Timeout em ms por requisição (padrão: 10 000)
 */

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/** URL base do servidor MCP. Lida em tempo de execução para facilitar testes. */
function getMcpBaseUrl(): URL {
  const rawUrl = process.env["MCP_BASE_URL"] ?? "http://mcp-server:3002/mcp";
  return new URL(rawUrl);
}

// ---------------------------------------------------------------------------
// Exceções de domínio
// ---------------------------------------------------------------------------

/**
 * Lançada quando a requisição ao servidor MCP excede o timeout configurado.
 * O chamador deve tratar como indisponibilidade temporária.
 */
export class McpTimeoutError extends Error {
  constructor(toolName: string, timeoutMs: number) {
    super(`Timeout ao chamar tool "${toolName}" após ${timeoutMs}ms`);
    this.name = "McpTimeoutError";
  }
}

/**
 * Lançada quando a resposta do servidor MCP não pode ser interpretada
 * por seguir um formato inesperado (ex.: JSON inválido, campos ausentes).
 */
export class McpParseError extends Error {
  constructor(toolName: string, detail: string) {
    super(`Resposta inválida do MCP para tool "${toolName}": ${detail}`);
    this.name = "McpParseError";
  }
}

/**
 * Lançada quando a tool MCP retorna um resultado de erro explícito
 * (`isError: true` ou campo `error` no envelope JSON-RPC).
 */
export class McpToolError extends Error {
  constructor(toolName: string, message: string) {
    super(`Erro retornado pela tool MCP "${toolName}": ${message}`);
    this.name = "McpToolError";
  }
}

let mcpClientPromise: Promise<Client> | null = null;

async function getMcpClientSingleton(): Promise<Client> {
  if (mcpClientPromise) return mcpClientPromise;

  mcpClientPromise = (async () => {
    const mcpUrl = getMcpBaseUrl();
    const transport = new StreamableHTTPClientTransport(mcpUrl);

    const client = new Client(
      { name: "BackendBot", version: "1.0.0" },
      { capabilities: {} },
    );

    await client.connect(transport);
    console.log("Backend conectado ao MCP via SSE!");

    return client;
  })();

  return mcpClientPromise;
}

async function getLangChainToolsFromMcp() {
  const mcpClient = await getMcpClientSingleton();
  const mcpToolsResponse = await mcpClient.listTools();

  const langchainTools = mcpToolsResponse.tools.map((mcpTool) => {
    return new DynamicStructuredTool({
      name: mcpTool.name,
      description:
        mcpTool.description || `Executa a ferramenta ${mcpTool.name}`,
      // O MCP já usa JSON Schema, que é perfeito para o LLM
      schema: mcpTool.inputSchema,
      func: async (args: Record<string, unknown>) => {
        console.log(`[Backend] LLM acionou a tool: ${mcpTool.name}`);

        // Executa a tool no servidor MCP
        const result = (await mcpClient.callTool({
          name: mcpTool.name,
          arguments: args,
        })) as { content: { type: string; text: string }[] };

        // O MCP retorna um array de "contents". Vamos extrair o texto.
        // Em um cenário real, você pode querer tratar erros aqui.
        const textContent = result.content.find((c) => c.type === "text")?.text;
        return textContent || "A ferramenta não retornou dados.";
      },
    });
  });

  return langchainTools;
}


const llm = new ChatOpenRouter({
  model: process.env["OPENROUTER_MODEL"] ?? "deepseek-chat", // Or "deepseek/deepseek-r1" for reasoning
  apiKey: process.env["OPENROUTER_API_KEY"] ?? "local", // Ensure this env variable is set
  temperature: 0,
});
const tools = await getLangChainToolsFromMcp();
const checkpointer = new MemorySaver();
const agent = createAgent({ model: llm, checkpointer, tools });

export async function processarMensagemDoChat(
  mensagemDoUsuario: string,
  tenantId: string,
) {
  // 3. Primeira chamada ao LLM
  console.log("[Backend] Consultando o LLM...");

  let response = await agent.invoke({messages: [
    new SystemMessage(
      `Você é um assistente financeiro pessoal. Responda SEMPRE em português, de forma curta e direta (no máximo 3 frases). Seja útil, claro e acionável. Não use saudações nem conclusões genéricas. Quando não souber a resposta, diga isso de forma simples. O tenant_id é ${tenantId}.`,
    ),
    new HumanMessage(mensagemDoUsuario),
  ]});

  // 6. Retorna a string final para o seu Frontend (React)
  return response.messages.at(-1)?.content;
}
