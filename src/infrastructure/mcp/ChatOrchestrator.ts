/**
 * Orquestrador de chat via agente LangChain + MCP.
 *
 * ## Fluxo de execução
 *
 *   Cliente → POST /api/chat (web :3001)
 *     → ChatOrchestrator.orchestrateChat(message, { tenantId, userId, role })
 *       → processarMensagemDoChat()  — agente LangChain com tools MCP wrappadas
 *         → MultiServerMCPClient    — conexão lazy ao servidor MCP (:3002)
 *         → buildWrappedTools       — injeta tenant_id do estado, nunca do LLM
 *         → createAgent             — stateSchema + checkpointer + middleware
 *     ← { reply: string }
 *
 * ## Segurança
 *   - thread_id = `${tenantId}:${userId}` — isolamento por usuário
 *   - tenant_id injetado no estado autenticado antes de chamar cada tool MCP
 *   - Tools admin-only filtradas para usuários member
 *
 * @see docs/chat-flow.md — documentação técnica do fluxo completo
 */

import {
  processarMensagemDoChat,
  type AgentUserRole,
} from "./McpClient.ts";
import type { FinancialContextResult } from "../chat/FinancialContextBuilder.ts";

// ---------------------------------------------------------------------------
// Ponto de entrada do orquestrador
// ---------------------------------------------------------------------------

/**
 * Orquestra uma mensagem de chat via agente LangChain com tools MCP.
 *
 * @param message           Mensagem do usuário (texto livre).
 * @param tenantId          UUID do tenant autenticado (do JWT — nunca do body).
 * @param userId            ID do usuário autenticado (campo `sub` do JWT).
 * @param role              Role do usuário (`member` | `admin`).
 * @param financialContext  Contexto financeiro carregado pelo backend (opcional — fallback se indisponível).
 * @returns                 Resposta do LLM em pt-BR.
 */
export async function orchestrateChat(
  message: string,
  {
    tenantId,
    userId,
    role,
    financialContext,
  }: {
    tenantId: string;
    userId: string;
    role: AgentUserRole;
    financialContext?: FinancialContextResult;
  },
): Promise<string> {
  return processarMensagemDoChat(message, { tenantId, userId, role, financialContext });
}
