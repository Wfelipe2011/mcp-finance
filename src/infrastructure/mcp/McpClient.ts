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
function getMcpBaseUrl(): string {
  return process.env["MCP_BASE_URL"] ?? "http://mcp-server:3002/mcp";
}

/** Timeout em ms para chamadas ao servidor MCP. */
function getMcpTimeoutMs(): number {
  return parseInt(process.env["MCP_TIMEOUT_MS"] ?? "10000", 10);
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

// ---------------------------------------------------------------------------
// Tipos internos do protocolo JSON-RPC 2.0 / MCP
// ---------------------------------------------------------------------------

interface McpContentItem {
  type: string;
  text?: string;
}

interface McpToolResult {
  content?: McpContentItem[];
  isError?: boolean;
}

interface McpJsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: McpToolResult;
  error?: { code: number; message: string; data?: unknown };
}

// ---------------------------------------------------------------------------
// Contador de requisições (monotônico, reinicia a cada processo)
// ---------------------------------------------------------------------------

let requestIdCounter = 0;

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Chama uma tool do servidor MCP via JSON-RPC 2.0 (`tools/call`).
 *
 * Fluxo:
 *  1. Serializa a chamada no formato JSON-RPC 2.0.
 *  2. Envia POST para MCP_BASE_URL com AbortController para timeout.
 *  3. Desserializa e valida o envelope de resposta de forma defensiva.
 *  4. Extrai `result.content[0].text` e retorna como string.
 *
 * @param toolName Nome da tool registrada no servidor MCP.
 * @param args     Argumentos da tool (deve incluir `tenant_id`).
 * @returns Texto extraído de `content[0].text` da resposta MCP.
 * @throws {McpTimeoutError} quando a requisição excede MCP_TIMEOUT_MS.
 * @throws {McpParseError}   quando a resposta não segue o formato esperado.
 * @throws {McpToolError}    quando a tool retorna `isError: true` ou erro JSON-RPC.
 */
export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const baseUrl = getMcpBaseUrl();
  console.log("🚀 ~ callMcpTool ~ baseUrl:", baseUrl);
  const timeoutMs = getMcpTimeoutMs();
  console.log("🚀 ~ callMcpTool ~ timeoutMs:", timeoutMs);
  const id = ++requestIdCounter;
  console.log("🚀 ~ callMcpTool ~ id:", id);

  const requestBody = JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      // name: toolName,
       arguments: args },
  });
  console.log("🚀 ~ callMcpTool ~ requestBody:", requestBody);

  // Configura timeout via AbortController
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: requestBody,
      signal: controller.signal,
    });
  } catch (err) {
    console.log("🚀 ~ callMcpTool ~ err:", err);
    if ((err as Error).name === "AbortError") {
      throw new McpTimeoutError(toolName, timeoutMs);
    }
    // Erro de rede (conexão recusada, DNS, etc.) — relança para o chamador decidir
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  // ---------------------------------------------------------------------------
  // Parse defensivo da resposta
  // ---------------------------------------------------------------------------

  let json: McpJsonRpcResponse;
  try {
    json = (await response.json()) as McpJsonRpcResponse;
  } catch {
    console.log("🚀 ~ callMcpTool ~ error response");
    throw new McpParseError(toolName, "resposta não é JSON válido");
  }

  // Erro no nível do envelope JSON-RPC (ex: método desconhecido, tool não registrada)
  if (json.error) {
    console.log("🚀 ~ callMcpTool ~ json.error:", json.error);
    throw new McpToolError(toolName, json.error.message);
  }

  // Valida presença e formato de result.content
  const result = json.result;
  if (result === undefined || result === null) {
    console.log("🚀 ~ callMcpTool ~ result is undefined or null");
    throw new McpParseError(toolName, "campo 'result' ausente na resposta");
  }

  if (!Array.isArray(result.content) || result.content.length === 0) {
    console.log("🚀 ~ callMcpTool ~ result.content is not an array or is empty");
    throw new McpParseError(
      toolName,
      "campo 'result.content' ausente ou vazio",
    );
  }

  // A tool sinalizou erro no nível de aplicação (isError: true)
  if (result.isError === true) {
    console.log("🚀 ~ callMcpTool ~ result.isError is true");
    const errorText = result.content[0]?.text ?? "erro desconhecido";
    throw new McpToolError(toolName, errorText);
  }

  // Valida que o primeiro item de content possui text como string
  const firstItem = result.content[0];
  console.log("🚀 ~ callMcpTool ~ firstItem:", firstItem);
  if (!firstItem || typeof firstItem.text !== "string") {
    console.log("🚀 ~ callMcpTool ~ firstItem.text is not a string");
    throw new McpParseError(
      toolName,
      "content[0].text ausente ou não é uma string",
    );
  }

  console.log("🚀 ~ callMcpTool ~ firstItem.text:", firstItem.text);
  return firstItem.text;
}
