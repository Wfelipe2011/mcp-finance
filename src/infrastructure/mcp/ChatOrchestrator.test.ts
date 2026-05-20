/**
 * Testes unitários para ChatOrchestrator.
 *
 * Cobre:
 *  - orchestrateChat(): nova assinatura { tenantId, userId, role }
 *  - Delegação correta para processarMensagemDoChat
 *  - Propagação de parâmetros autenticados
 *
 * Estratégia: mock.module do McpClient para isolar o orquestrador.
 *
 * Run: bun test src/infrastructure/mcp/ChatOrchestrator.test.ts
 */
import { mock, describe, it, expect, beforeEach } from "bun:test";

// ---------------------------------------------------------------------------
// Mock do McpClient — declarado antes do import do orquestrador
// ---------------------------------------------------------------------------

const mockProcessar = mock(
  async (
    _message: string,
    _opts: { tenantId: string; userId: string; role: "member" | "admin" },
  ): Promise<string> => {
    return "Resposta do agente";
  },
);

mock.module("./McpClient.ts", () => ({
  processarMensagemDoChat: mockProcessar,
  McpTimeoutError: class McpTimeoutError extends Error {},
  McpParseError: class McpParseError extends Error {},
  McpToolError: class McpToolError extends Error {},
}));

import { orchestrateChat } from "./ChatOrchestrator.ts";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("orchestrateChat", () => {
  beforeEach(() => {
    mockProcessar.mockClear();
    mockProcessar.mockImplementation(async () => "Resposta do agente");
  });

  it("retorna a resposta do processarMensagemDoChat", async () => {
    const reply = await orchestrateChat("qual meu saldo?", {
      tenantId: "t1",
      userId: "u1",
      role: "member",
    });
    expect(reply).toBe("Resposta do agente");
  });

  it("passa a mensagem corretamente para processarMensagemDoChat", async () => {
    await orchestrateChat("qual minha fatura?", {
      tenantId: "t1",
      userId: "u1",
      role: "member",
    });

    expect(mockProcessar).toHaveBeenCalledTimes(1);
    const [msg] = mockProcessar.mock.calls[0] as [string, object];
    expect(msg).toBe("qual minha fatura?");
  });

  it("passa tenantId corretamente para processarMensagemDoChat", async () => {
    await orchestrateChat("mensagem", {
      tenantId: "tenant-especifico",
      userId: "u1",
      role: "member",
    });

    const [, opts] = mockProcessar.mock.calls[0] as [
      string,
      { tenantId: string; userId: string; role: string },
    ];
    expect(opts.tenantId).toBe("tenant-especifico");
  });

  it("passa userId corretamente para processarMensagemDoChat", async () => {
    await orchestrateChat("mensagem", {
      tenantId: "t1",
      userId: "user-uuid-123",
      role: "member",
    });

    const [, opts] = mockProcessar.mock.calls[0] as [
      string,
      { tenantId: string; userId: string; role: string },
    ];
    expect(opts.userId).toBe("user-uuid-123");
  });

  it("passa role 'admin' corretamente", async () => {
    await orchestrateChat("status do pipeline?", {
      tenantId: "t1",
      userId: "admin-user",
      role: "admin",
    });

    const [, opts] = mockProcessar.mock.calls[0] as [
      string,
      { tenantId: string; userId: string; role: string },
    ];
    expect(opts.role).toBe("admin");
  });

  it("passa role 'member' corretamente", async () => {
    await orchestrateChat("qual meu saldo?", {
      tenantId: "t1",
      userId: "u1",
      role: "member",
    });

    const [, opts] = mockProcessar.mock.calls[0] as [
      string,
      { tenantId: string; userId: string; role: string },
    ];
    expect(opts.role).toBe("member");
  });

  it("propaga exceções lançadas por processarMensagemDoChat", async () => {
    mockProcessar.mockImplementation(async () => {
      throw new Error("Falha de conexão MCP");
    });

    await expect(
      orchestrateChat("mensagem", { tenantId: "t1", userId: "u1", role: "member" }),
    ).rejects.toThrow("Falha de conexão MCP");
  });
});
