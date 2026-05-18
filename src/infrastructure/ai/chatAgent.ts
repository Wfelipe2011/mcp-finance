/**
 * @deprecated Este módulo não é mais utilizado pelo endpoint `/api/chat`.
 * O fluxo de chat foi migrado para orquestração via MCP em
 * `src/infrastructure/mcp/ChatOrchestrator.ts` (change: chat-endpoint-via-mcp).
 *
 * O arquivo é mantido apenas porque pode ser reaproveitado em cenários futuros
 * que requeiram resposta por LLM direto. Não introduza novos imports deste módulo
 * no caminho web sem revisar o change.
 */
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { model } from "./model.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateChatReply(
  message: string,
  history?: ChatMessage[],
): Promise<string> {
  try {
    const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
      new SystemMessage(
        "Você é um assistente financeiro pessoal. Responda SEMPRE em português, de forma curta e direta (no máximo 3 frases). Seja útil, claro e acionável. Não use saudações nem conclusões genéricas. Quando não souber a resposta, diga isso de forma simples.",
      ),
    ];

    if (history && history.length > 0) {
      for (const msg of history.slice(-6)) {
        if (msg.role === "user") {
          messages.push(new HumanMessage(msg.content));
        } else {
          messages.push(new AIMessage(msg.content));
        }
      }
    }

    messages.push(new HumanMessage(message));

    let result: Awaited<ReturnType<typeof model.invoke>>;
    try {
      result = await model.invoke(messages);
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new Error(`[chatAgent] Falha ao chamar o modelo de IA: ${cause}`);
    }

    const text = String(result.content).trim();
    if (!text) {
      throw new Error("[chatAgent] Modelo não retornou conteúdo");
    }

    return text;
  } catch (error) {
    console.error("[chatAgent] Erro ao gerar resposta do chat:", error);
    throw new Error(`[chatAgent] Falha ao gerar resposta do chat: ${error}`);
  }
}
