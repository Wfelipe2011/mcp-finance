/**
 * Testes de integração do endpoint POST /api/chat.
 *
 * Cobre:
 *  - Validações de entrada: message obrigatório, history com estrutura válida
 *  - Sucesso: { reply: string } com mensagens de diferentes intents
 *  - Fallback de intent desconhecida (resposta 200 com mensagem amigável)
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

const mockOrchestrateChat = mock(async (_message: string, _tenantId: string): Promise<string> => {
  return "Resposta de teste do orquestrador";
});

const mockDetectIntent = mock((_message: string): string => {
  return "get_monthly_balance";
});

mock.module("../../../../infrastructure/mcp/ChatOrchestrator.ts", () => ({
  orchestrateChat: mockOrchestrateChat,
  detectIntent: mockDetectIntent,
}));

// ---------------------------------------------------------------------------
// Import do handler — usa a versão mockada do ChatOrchestrator
// ---------------------------------------------------------------------------
import { handleChat } from "../chat.ts";

// ---------------------------------------------------------------------------
// Helpers de requisição
// ---------------------------------------------------------------------------

const TENANT_ID = "tenant-test-uuid-123";

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

// ---------------------------------------------------------------------------
// Suite de testes
// ---------------------------------------------------------------------------

describe("POST /api/chat — handleChat", () => {
  beforeEach(() => {
    // Reseta contadores e restaura implementação padrão entre testes
    mockOrchestrateChat.mockClear();
    mockDetectIntent.mockClear();
    mockOrchestrateChat.mockImplementation(
      async () => "Resposta de teste do orquestrador",
    );
    mockDetectIntent.mockImplementation(() => "get_monthly_balance");
  });

  // -------------------------------------------------------------------------
  // Sucesso → 200
  // -------------------------------------------------------------------------

  it("retorna 200 com { reply: string } para mensagem válida", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo?" });
    const res = await handleChat(req, TENANT_ID);
    const json = (await res.json()) as { reply: string };

    expect(res.status).toBe(200);
    expect(typeof json.reply).toBe("string");
    expect(json.reply).toBe("Resposta de teste do orquestrador");
  });

  it("passa a mensagem trimada e o tenantId correto para orchestrateChat", async () => {
    const req = makeJsonRequest({ message: "  qual meu saldo?  " });
    await handleChat(req, TENANT_ID);

    expect(mockOrchestrateChat).toHaveBeenCalledTimes(1);
    const [msg, tid] = mockOrchestrateChat.mock.calls[0] as [string, string];
    expect(msg).toBe("qual meu saldo?");
    expect(tid).toBe(TENANT_ID);
  });

  it("aceita history opcional com itens válidos e retorna 200", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      history: [
        { role: "user", content: "olá" },
        { role: "assistant", content: "Olá! Como posso ajudar?" },
      ],
    });
    const res = await handleChat(req, TENANT_ID);

    expect(res.status).toBe(200);
  });

  it("aceita ausência de history e retorna 200", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo?" });
    const res = await handleChat(req, TENANT_ID);

    expect(res.status).toBe(200);
  });

  it("retorna o reply de fallback de intent desconhecida (status 200)", async () => {
    mockOrchestrateChat.mockImplementation(
      async () =>
        "Desculpe, não consegui entender sua pergunta. Tente perguntar sobre seu saldo mensal, assinaturas ou cartões de crédito.",
    );
    mockDetectIntent.mockImplementation(() => "unknown");

    const req = makeJsonRequest({ message: "que horas são?" });
    const res = await handleChat(req, TENANT_ID);
    const json = (await res.json()) as { reply: string };

    expect(res.status).toBe(200);
    expect(json.reply).toContain("Desculpe");
  });

  // -------------------------------------------------------------------------
  // Validação de entrada → 400
  // -------------------------------------------------------------------------

  it("retorna 400 quando o body não é JSON válido", async () => {
    const req = makeInvalidJsonRequest();
    const res = await handleChat(req, TENANT_ID);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando message está ausente", async () => {
    const req = makeJsonRequest({});
    const res = await handleChat(req, TENANT_ID);
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(json.error).toContain("message");
  });

  it("retorna 400 quando message é string vazia (somente espaços)", async () => {
    const req = makeJsonRequest({ message: "   " });
    const res = await handleChat(req, TENANT_ID);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando message é um número", async () => {
    const req = makeJsonRequest({ message: 42 });
    const res = await handleChat(req, TENANT_ID);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando message é null", async () => {
    const req = makeJsonRequest({ message: null });
    const res = await handleChat(req, TENANT_ID);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando history não é um array", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo?", history: "não é array" });
    const res = await handleChat(req, TENANT_ID);
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(json.error).toContain("history");
  });

  it("retorna 400 quando history é um objeto (não array)", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo?", history: { role: "user" } });
    const res = await handleChat(req, TENANT_ID);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando item de history tem role inválido ('system')", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      history: [{ role: "system", content: "instrução interna" }],
    });
    const res = await handleChat(req, TENANT_ID);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando item de history não tem content string", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      history: [{ role: "user", content: 123 }],
    });
    const res = await handleChat(req, TENANT_ID);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando item de history está sem role", async () => {
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      history: [{ content: "mensagem sem role" }],
    });
    const res = await handleChat(req, TENANT_ID);

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
    const res = await handleChat(req, TENANT_ID);
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(500);
    // Não deve vazar detalhes internos
    expect(json.error).not.toContain("Falha crítica inesperada no sistema interno");
    expect(json.error).toContain("Erro interno");
  });

  it("não invoca orchestrateChat quando a validação de entrada falha", async () => {
    const req = makeJsonRequest({ message: "" });
    await handleChat(req, TENANT_ID);

    expect(mockOrchestrateChat).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Verificação de contrato da API (5.3)
  //
  // Garante que o endpoint continua compatível com o frontend sem mudanças:
  //   Entrada:  { message: string, history?: Array<{ role, content }> }
  //   Saída:    { reply: string }
  // -------------------------------------------------------------------------

  it("contrato: aceita { message: string } e retorna exatamente { reply: string }", async () => {
    const req = makeJsonRequest({ message: "qual meu saldo mensal?" });
    const res = await handleChat(req, TENANT_ID);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    // Saída deve ter exatamente o campo 'reply'
    expect("reply" in json).toBe(true);
    expect(typeof json["reply"]).toBe("string");
    // Não deve retornar campos extras não esperados pelo frontend
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
    const res = await handleChat(req, TENANT_ID);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect("reply" in json).toBe(true);
    expect(typeof json["reply"]).toBe("string");
  });

  it("contrato: tenantId nunca é lido do body (parâmetro autenticado)", async () => {
    // Mesmo que body contenha tenant_id, o handler deve usar o parâmetro da função
    const req = makeJsonRequest({
      message: "qual meu saldo?",
      tenant_id: "tenant-malicioso-do-body",
    });
    await handleChat(req, TENANT_ID);

    const [, tid] = mockOrchestrateChat.mock.calls[0] as [string, string];
    expect(tid).toBe(TENANT_ID);
    expect(tid).not.toBe("tenant-malicioso-do-body");
  });
});
