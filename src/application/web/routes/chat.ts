import { jsonResponse, errorResponse } from "../helpers.ts";
import { generateChatReply, type ChatMessage } from "../../../infrastructure/ai/chatAgent.ts";

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
}

export async function handleChat(req: Request, _tenantId: string): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  if (typeof body.message !== "string" || body.message.trim() === "") {
    return errorResponse("O campo 'message' é obrigatório e não pode estar vazio", 400);
  }

  let history: ChatMessage[] | undefined;
  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) {
      return errorResponse("O campo 'history' deve ser um array", 400);
    }
    const parsed: ChatMessage[] = [];
    for (const item of body.history) {
      if (
        typeof item !== "object" ||
        item === null ||
        (item.role !== "user" && item.role !== "assistant") ||
        typeof item.content !== "string"
      ) {
        return errorResponse("Cada item de 'history' deve ter 'role' ('user' ou 'assistant') e 'content' string", 400);
      }
      parsed.push({ role: item.role as "user" | "assistant", content: item.content });
    }
    history = parsed;
  }

  try {
    const reply = await generateChatReply(body.message.trim(), history);
    return jsonResponse({ reply });
  } catch {
    return errorResponse("Erro interno ao processar a resposta do chat", 500);
  }
}
