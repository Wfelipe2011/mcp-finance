/**
 * Testes de integração do endpoint POST /api/chat.
 *
 * Cobre:
 *  - Validações de entrada: message obrigatório, history com estrutura válida
 *  - Sucesso: { reply: string } com mensagens válidas
 *  - Falha do orquestrador: exceção inesperada → 500 sem vazar detalhes internos
 *  - Contrato da API: aceita { message, history? } e retorna { reply }
 *
 * Estratégia: mock.module do ChatOrchestrator para isolar o handler das dependências
 * externas (MCP, fetch). O bun:test hoista o mock.module antes dos imports.
 *
 * Run: bun test src/application/web/routes/__tests__/chat.test.ts
 */
import { mock, describe, it, expect, beforeEach } from "bun:test";

// ---------------------------------------------------------------------------
// Mock do módulo ChatOrchestrator — declarado antes do import do handler
// O bun:test hoista esta chamada para antes de todos os imports
// ---------------------------------------------------------------------------

const mockOrchestrateChat = mock(
  async (
    _message: string,
    _opts: { tenantId: string; userId: string; role: "member" | "admin" },
  ): Promise<string> => {
    return "Resposta de teste do orquestrador";
  },
);

mock.module("../../../../infrastructure/mcp/ChatOrchestrator.ts", () => ({
  orchestrateChat: mockOrchestrateChat,
}));

// ---------------------------------------------------------------------------
// Import do handler — usa a versão mockada do ChatOrchestrator
// ---------------------------------------------------------------------------
import { handleChat } from "../chat.ts";

// ---------------------------------------------------------------------------
// Helpers de requisição
// ---------------------------------------------------------------------------

const TENANT_ID = "tenant-test-uuid-123";
const USER_ID = "user-test-uuid-456";
const USER_ROLE = "member" as const;

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ json: inválido }",
  });
}

// Helper para chamar handleChat com parâmetros padrão
function chatRequest(req: Request) {
  return handleChat(req, TENANT_ID, USER_ID, USER_ROLE);
}

// ---------------------------------------------------------------------------
// Suite de testes
// ---------------------------------------------------------------------------

describe("POST /api/chat — handleChat", () => {
  beforeEach(() => {
    mockOrchestrateChat.mockClear();
    mockOrchestrateChat.mockImplementation(
      async () => "Resposta de teste do orquestrador",
    );
  });

  // -------------------------------------------------------------------------
  // Sucesso → 200
  // -------------------------------------------------------------------------

  it("retorna 200 com { reply: string } para mensagem válida", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo?" });
    const res = await chatRequest(req);
    const json = (await res.json()) as { reply: string };

    expect(res.status).toBe(200);
    expect(typeof json.reply).toBe("string");
    expect(json.reply).toBe("Resposta de teste do orquestrador");
  });

  it("passa a mensagem trimada, tenantId, userId e role corretos para orchestrateChat", async () => {
    const req = makeJsonRequest({ message: "  qual meu saldo?  " });
    await chatRequest(req);

    expect(mockOrchestrateChat).toHaveBeenCalledTimes(1);
    const [msg, opts] = mockOrchestrateChat.mock.calls[0] as [
      string,
      { tenantId: string; userId: string; role: string },
    ];
    expect(msg).toBe("qual meu saldo?");
    expect(opts.tenantId).toBe(TENANT_ID);
    expect(opts.userId).toBe(USER_ID);
    expect(opts.role).toBe(USER_ROLE);
  });

  it("aceita history opcional com itens válidos e retorna 200", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      history: [
        { role: "user", content: "olá" },
        { role: "assistant", content: "Olá! Como posso ajudar?" },
      ],
    });
    const res = await chatRequest(req);

    expect(res.status).toBe(200);
  });

  it("aceita ausência de history e retorna 200", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo?" });
    const res = await chatRequest(req);

    expect(res.status).toBe(200);
  });

  it("retorna o reply de resposta do agente (status 200)", async () => {
    mockOrchestrateChat.mockImplementation(
      async () => "Seu saldo mensal é R$ 3.300,00 positivo.",
    );

    const req = makeJsonRequest({ message: "qual meu saldo?" });
    const res = await chatRequest(req);
    const json = (await res.json()) as { reply: string };

    expect(res.status).toBe(200);
    expect(json.reply).toContain("saldo");
  });

  // -------------------------------------------------------------------------
  // Validação de entrada → 400
  // -------------------------------------------------------------------------

  it("retorna 400 quando o body não é JSON válido", async () => {
    const req = makeInvalidJsonRequest();
    const res = await chatRequest(req);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando message está ausente", async () => {
    const req = makeJsonRequest({});
    const res = await chatRequest(req);
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(json.error).toContain("message");
  });

  it("retorna 400 quando message é string vazia (somente espaços)", async () => {
    const req = makeJsonRequest({ message: "   " });
    const res = await chatRequest(req);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando message é um número", async () => {
    const req = makeJsonRequest({ message: 42 });
    const res = await chatRequest(req);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando message é null", async () => {
    const req = makeJsonRequest({ message: null });
    const res = await chatRequest(req);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando history não é um array", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo?", history: "não é array" });
    const res = await chatRequest(req);
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(json.error).toContain("history");
  });

  it("retorna 400 quando history é um objeto (não array)", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo?", history: { role: "user" } });
    const res = await chatRequest(req);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando item de history tem role inválido ('system')", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      history: [{ role: "system", content: "instrução interna" }],
    });
    const res = await chatRequest(req);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando item de history não tem content string", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      history: [{ role: "user", content: 123 }],
    });
    const res = await chatRequest(req);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando item de history está sem role", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      history: [{ content: "mensagem sem role" }],
    });
    const res = await chatRequest(req);

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Erro interno → 500
  // -------------------------------------------------------------------------

  it("retorna 500 com mensagem genérica quando orchestrateChat lança exceção inesperada", async () => {
    mockOrchestrateChat.mockImplementation(async () => {
      throw new Error("Falha crítica inesperada no sistema interno");
    });

    const req = makeJsonRequest({ message: "qual meu saldo?" });
    const res = await chatRequest(req);
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(500);
    expect(json.error).not.toContain("Falha crítica inesperada no sistema interno");
    expect(json.error).toContain("Erro interno");
  });

  it("não invoca orchestrateChat quando a validação de entrada falha", async () => {
    const req = makeJsonRequest({ message: "" });
    await chatRequest(req);

    expect(mockOrchestrateChat).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Contrato da API
  // -------------------------------------------------------------------------

  it("contrato: aceita { message: string } e retorna exatamente { reply: string }", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo mensal?" });
    const res = await chatRequest(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect("reply" in json).toBe(true);
    expect(typeof json["reply"]).toBe("string");
    expect(Object.keys(json)).toHaveLength(1);
  });

  it("contrato: aceita { message, history } com history completo e retorna { reply }", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      history: [
        { role: "user", content: "tenho alguma despesa?" },
        { role: "assistant", content: "Você teve R$ 1.000 de despesas." },
      ],
    });
    const res = await chatRequest(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect("reply" in json).toBe(true);
    expect(typeof json["reply"]).toBe("string");
  });

  it("contrato: tenantId nunca é lido do body (parâmetro autenticado)", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      tenant_id: "tenant-malicioso-do-body",
    });
    await chatRequest(req);

    const [, opts] = mockOrchestrateChat.mock.calls[0] as [
      string,
      { tenantId: string; userId: string; role: string },
    ];
    expect(opts.tenantId).toBe(TENANT_ID);
    expect(opts.tenantId).not.toBe("tenant-malicioso-do-body");
  });
});
