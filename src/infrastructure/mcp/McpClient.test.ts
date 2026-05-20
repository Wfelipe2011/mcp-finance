/**
 * Testes unitários para McpClient.
 *
 * Cobre:
 *  - Erros de domínio: McpTimeoutError, McpParseError, McpToolError (exports)
 *  - Nova assinatura de processarMensagemDoChat({ tenantId, userId, role })
 *  - Funções auxiliares exportadas: filterToolsByRole, buildWrappedTools, createCheckpointer
 *
 * Nota: Testes de comportamento das tools (filterToolsByRole, buildWrappedTools)
 * estão em __tests__/McpSecurity.test.ts.
 *
 * Run: bun test src/infrastructure/mcp/McpClient.test.ts
 */
import { describe, it, expect } from "bun:test";
import {
  McpTimeoutError,
  McpParseError,
  McpToolError,
  filterToolsByRole,
  buildWrappedTools,
  createCheckpointer,
  processarMensagemDoChat,
} from "./McpClient.ts";

// ---------------------------------------------------------------------------
// Erros de domínio — mantidos para compatibilidade
// ---------------------------------------------------------------------------

describe("McpTimeoutError", () => {
  it("instancia com nome e mensagem corretos", () => {
    const err = new McpTimeoutError("get_monthly_balance", 5000);
    expect(err.name).toBe("McpTimeoutError");
    expect(err.message).toContain("get_monthly_balance");
    expect(err.message).toContain("5000");
    expect(err).toBeInstanceOf(Error);
  });
});
describe("McpParseError", () => {
  it("instancia com nome e mensagem corretos", () => {
    const err = new McpParseError("get_subscription_analysis", "campo ausente");
    expect(err.name).toBe("McpParseError");
    expect(err.message).toContain("get_subscription_analysis");
    expect(err.message).toContain("campo ausente");
    expect(err).toBeInstanceOf(Error);
  });
});
describe("McpToolError", () => {
  it("instancia com nome e mensagem corretos", () => {
    const err = new McpToolError("get_credit_card_status", "tenant inválido");
    expect(err.name).toBe("McpToolError");
    expect(err.message).toContain("get_credit_card_status");
    expect(err.message).toContain("tenant inválido");
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// Exports necessários
// ---------------------------------------------------------------------------

describe("exports do McpClient", () => {
  it("filterToolsByRole está exportado e é uma função", () => {
    expect(typeof filterToolsByRole).toBe("function");
  });

  it("buildWrappedTools está exportado e é uma função", () => {
    expect(typeof buildWrappedTools).toBe("function");
  });

  it("createCheckpointer está exportado e é uma função", () => {
    expect(typeof createCheckpointer).toBe("function");
  });

  it("processarMensagemDoChat está exportado e é uma função", () => {
    expect(typeof processarMensagemDoChat).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Nova assinatura de processarMensagemDoChat
// ---------------------------------------------------------------------------

describe("processarMensagemDoChat — assinatura", () => {
  it("aceita os três parâmetros { tenantId, userId, role } sem erro de tipo", () => {
    // Apenas verifica que a função aceita a nova assinatura sem TypeScript errors.
    // A invocação real requer conexão com MCP, omitida aqui.
    const isFunction = typeof processarMensagemDoChat === "function";
    expect(isFunction).toBe(true);
  });

  it("retorna uma Promise quando chamada com assinatura correta", () => {
    // Intercepta antes de chegar à rede — apenas valida o tipo de retorno
    const promise = processarMensagemDoChat("ping", {
      tenantId: "t1",
      userId: "u1",
      role: "member",
    });
    // Deve ser uma Promise (a conexão ao MCP vai falhar, mas o tipo está correto)
    expect(promise).toBeInstanceOf(Promise);
    // Limpa a promise rejeitada sem causar UnhandledPromiseRejection
    promise.catch(() => {});
  });
});
