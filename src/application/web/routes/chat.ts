import type { SQL } from "bun";
import { jsonResponse, errorResponse } from "../helpers.ts";
import {
  orchestrateChat,
} from "../../../infrastructure/mcp/ChatOrchestrator.ts";
import {
  McpTimeoutError,
  McpToolError,
  McpParseError,
  type AgentUserRole,
} from "../../../infrastructure/mcp/McpClient.ts";
import { buildFinancialContext } from "../../../infrastructure/chat/FinancialContextBuilder.ts";

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
}

/**
 * Handler do endpoint POST /api/chat.
 *
 * Contrato da API: { message: string, history?: Array<{role, content}> } → { reply: string }
 *
 * O tenantId, userId e role são obtidos exclusivamente do JWT autenticado (parâmetros da função),
 * nunca do body da requisição. Qualquer tenant_id presente no body é ignorado.
 *
 * O diagnóstico financeiro é carregado com o tenant autenticado antes de chamar o orquestrador.
 * Se o diagnóstico falhar, o chat continua com contexto limitado.
 */
export async function handleChat(
  req: Request,
  tenantId: string,
  userId: string,
  role: AgentUserRole,
  sql: SQL,
): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  // Validação de entrada: message obrigatório
  if (typeof body.message !== "string" || body.message.trim() === "") {
    return errorResponse(
      "O campo 'message' é obrigatório e não pode estar vazio",
      400,
    );
  }

  // Validação de entrada: history opcional mas com estrutura válida
  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) {
      return errorResponse("O campo 'history' deve ser um array", 400);
    }
    for (const item of body.history) {
      if (
        typeof item !== "object" ||
        item === null ||
        (item.role !== "user" && item.role !== "assistant") ||
        typeof item.content !== "string"
      ) {
        return errorResponse(
          "Cada item de 'history' deve ter 'role' ('user' ou 'assistant') e 'content' string",
          400,
        );
      }
    }
  }

  const message = body.message.trim();
  const startMs = Date.now();

  // Carrega contexto financeiro com o tenant autenticado (nunca do body).
  // Fallback silencioso: se falhar, chat continua com contexto limitado.
  const financialContext = await buildFinancialContext(tenantId, sql);

  try {
    const reply = await orchestrateChat(message, { tenantId, userId, role, financialContext });

    console.log(`[chat] status=ok latencia=${Date.now() - startMs}ms`);

    return jsonResponse({ reply });
  } catch (err) {
    let tipoErro = "ERRO_INTERNO";
    if (err instanceof McpTimeoutError) tipoErro = "TIMEOUT";
    else if (err instanceof McpToolError) tipoErro = "MCP_TOOL_ERROR";
    else if (err instanceof McpParseError) tipoErro = "MCP_PARSE_ERROR";

    console.error(
      `[chat] status=erro latencia=${Date.now() - startMs}ms tipo=${tipoErro}`,
    );

    return errorResponse("Erro interno ao processar a resposta do chat", 500);
  }
}
