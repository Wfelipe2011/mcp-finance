/**
 * Orquestrador de chat via MCP.
 *
 * ## Fluxo de execução
 *
 *   Cliente → POST /api/chat (web :3001)
 *     → ChatOrchestrator.orchestrateChat()
 *       → detectIntent()           — detecção determinística por palavras-chave
 *       → callMcpTool()            — chamada JSON-RPC ao servidor MCP (:3002)
 *       → naturalize*()            — template em pt-BR, máx 3 frases
 *     ← { reply: string }
 *
 *   Resumo: web 3001 → MCP 3002 → naturalização → cliente
 *
 * ## Etapas internas
 *
 *  1. Detecta a intent da mensagem por palavras-chave (determinístico, sem LLM)
 *  2. Monta os argumentos obrigatórios para a tool MCP correspondente
 *  3. Chama o servidor MCP via `callMcpTool`
 *  4. Naturaliza o payload estruturado em resposta curta em pt-BR (máx 3 frases)
 *  5. Aplica fallback seguro em caso de intent desconhecida ou erro inesperado
 *
 * @see docs/chat-flow.md — documentação técnica do fluxo completo
 */

import { processarMensagemDoChat } from "./McpClient.ts";


/** Mensagem de fallback segura exibida quando a intent é desconhecida ou ocorre erro. */
const FALLBACK_MESSAGE =
  "Desculpe, não consegui entender sua pergunta. Tente perguntar sobre seu saldo mensal, assinaturas ou cartões de crédito.";

// ---------------------------------------------------------------------------
// Ponto de entrada do orquestrador
// ---------------------------------------------------------------------------

/**
 * Orquestra uma mensagem de chat via servidor MCP.
 *
 * @param message  Mensagem do usuário (texto livre).
 * @param tenantId UUID do tenant autenticado (NÃO vem do body da requisição).
 * @returns        Resposta naturalizada em pt-BR, em no máximo 3 frases.
 */
export async function orchestrateChat(message: string, tenantId: string) {
  const response = await processarMensagemDoChat(message, tenantId);
  return response ?? FALLBACK_MESSAGE;
}
