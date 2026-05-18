import { jsonResponse, errorResponse } from "../helpers.ts";
import { orchestrateChat, detectIntent } from "../../../infrastructure/mcp/ChatOrchestrator.ts";
import { McpTimeoutError, McpToolError, McpParseError } from "../../../infrastructure/mcp/McpClient.ts";

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
}

/**
 * Handler do endpoint POST /api/chat.
 *
 * Contrato da API: { message: string, history?: Array<{role, content}> } → { reply: string }
 *
 * O tenantId é obtido exclusivamente do JWT autenticado (parâmetro da função),
 * nunca do body da requisição.
 */
export async function handleChat(req: Request, tenantId: string): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  // 3.2 — Validação de entrada: message obrigatório
  if (typeof body.message !== "string" || body.message.trim() === "") {
    return errorResponse("O campo 'message' é obrigatório e não pode estar vazio", 400);
  }

  // 3.2 — Validação de entrada: history opcional mas com estrutura válida
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

  // 3.4 — Detecta intent antecipadamente para registrar nos logs operacionais
  // sem precisar logar o conteúdo da mensagem do usuário
  const intent = detectIntent(message);
  const inicioMs = Date.now();

  try {
    // 3.1 — Orquestração via MCP em vez de chamada direta ao LangChain
    // 3.3 — tenantId vem do parâmetro autenticado, nunca do body
    const reply = await orchestrateChat(message, tenantId);

    // 3.4 — Log operacional: latência e intent detectada (sem conteúdo sensível)
    console.log(`[chat] status=ok intent=${intent} latencia=${Date.now() - inicioMs}ms`);

    return jsonResponse({ reply });
  } catch (err) {
    // 3.4 — Classifica o tipo de erro para o log operacional sem expor detalhes internos
    let tipoErro = "ERRO_INTERNO";
    if (err instanceof McpTimeoutError) tipoErro = "TIMEOUT";
    else if (err instanceof McpToolError) tipoErro = "MCP_TOOL_ERROR";
    else if (err instanceof McpParseError) tipoErro = "MCP_PARSE_ERROR";

    console.error(`[chat] status=erro intent=${intent} latencia=${Date.now() - inicioMs}ms tipo=${tipoErro}`);

    // 3.2 — Resposta 500 padronizada sem vazar detalhes internos ao cliente
    return errorResponse("Erro interno ao processar a resposta do chat", 500);
  }
}
