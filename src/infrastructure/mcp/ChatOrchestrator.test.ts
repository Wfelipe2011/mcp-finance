/**
 * Testes unitários para ChatOrchestrator.
 *
 * Cobre:
 *  - detectIntent(): cada intent (frases reais em pt-BR) e fallback para "unknown"
 *  - buildMcpArgs(): argumentos montados para cada intent
 *  - orchestrateChat(): naturalização de payloads reais e tratamento de erros MCP
 *
 * Estratégia de mock: spyOn(globalThis, "fetch") — mesma abordagem de McpClient.test.ts.
 * O fetch mockado permite testar orchestrateChat de ponta a ponta, sem mockar callMcpTool.
 *
 * Run: bun test src/infrastructure/mcp/ChatOrchestrator.test.ts
 */
import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { detectIntent, orchestrateChat, buildMcpArgs } from "./ChatOrchestrator.ts";

// ---------------------------------------------------------------------------
// Helpers para montar respostas MCP simuladas
// ---------------------------------------------------------------------------

function makeMcpSuccess(text: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: {
        content: [{ type: "text", text }],
        isError: false,
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

function makeMcpToolErrorResponse(errorText: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: {
        content: [{ type: "text", text: errorText }],
        isError: true,
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

/** Simula AbortError disparado pelo AbortController após timeout. */
function makeAbortError(): Error {
  return Object.assign(new Error("The operation was aborted."), {
    name: "AbortError",
  });
}

// ---------------------------------------------------------------------------
// Payloads reais de exemplo por intent (amostras próximas das respostas do MCP)
// ---------------------------------------------------------------------------

const PAYLOAD_MONTHLY_BALANCE_POSITIVO = JSON.stringify([
  {
    year: 2026,
    month: 5,
    receitas_reais: 8500.0,
    despesas_reais: 5200.0,
    saldo_operacional: 3300.0,
    total_transacoes: 47,
  },
]);

const PAYLOAD_MONTHLY_BALANCE_NEGATIVO = JSON.stringify([
  {
    year: 2026,
    month: 5,
    receitas_reais: 3000.0,
    despesas_reais: 4500.0,
    saldo_operacional: -1500.0,
    total_transacoes: 30,
  },
]);

const PAYLOAD_SUBSCRIPTION_ANALYSIS = JSON.stringify({
  subscriptions: [
    { servico: "Netflix", total: 55.9, count: 1 },
    { servico: "Spotify", total: 21.9, count: 1 },
    { servico: "Amazon Prime", total: 19.9, count: 1 },
  ],
  stopped: [{ servico: "HBO Max" }],
});

const PAYLOAD_SUBSCRIPTION_VAZIO = JSON.stringify({
  subscriptions: [],
  stopped: [],
});

const PAYLOAD_CREDIT_CARD_STATUS = JSON.stringify({
  cards: [
    {
      nome: "Nubank Mastercard",
      saldo: 1200.0,
      limite: 5000.0,
      disponivel: 3800.0,
      vencimento: "2026-06-01",
      status: "normal",
    },
    {
      nome: "Itaú Visa",
      saldo: 4700.0,
      limite: 5000.0,
      disponivel: 300.0,
      vencimento: "2026-06-10",
      status: "critico",
    },
  ],
  ultimas_faturas_pagas: [{ valor: 4200.0 }, { valor: 3900.0 }],
});

const PAYLOAD_CREDIT_CARD_SEM_CARTOES = JSON.stringify({
  cards: [],
  ultimas_faturas_pagas: [],
});

// ---------------------------------------------------------------------------
// Suite: detectIntent
// ---------------------------------------------------------------------------

describe("detectIntent", () => {
  describe("get_monthly_balance", () => {
    it('detecta "qual meu saldo do mês?"', () => {
      expect(detectIntent("qual meu saldo do mês?")).toBe("get_monthly_balance");
    });

    it('detecta "quais meus gastos esse mês?"', () => {
      expect(detectIntent("quais meus gastos esse mês?")).toBe("get_monthly_balance");
    });

    it('detecta "quanto recebi este mês"', () => {
      expect(detectIntent("quanto recebi este mês")).toBe("get_monthly_balance");
    });

    it('detecta "quanto gastei essa semana"', () => {
      expect(detectIntent("quanto gastei essa semana")).toBe("get_monthly_balance");
    });

    it('detecta "qual o balanço do mês?"', () => {
      expect(detectIntent("qual o balanço do mês?")).toBe("get_monthly_balance");
    });

    it('detecta "qual minha receita mensal?"', () => {
      expect(detectIntent("qual minha receita mensal?")).toBe("get_monthly_balance");
    });

    it('detecta "quanto sobrou no mês?"', () => {
      expect(detectIntent("quanto sobrou no mês?")).toBe("get_monthly_balance");
    });
  });

  describe("get_subscription_analysis", () => {
    it('detecta "tenho assinaturas ativas?"', () => {
      expect(detectIntent("tenho assinaturas ativas?")).toBe("get_subscription_analysis");
    });

    it('detecta "quais minhas mensalidades?"', () => {
      expect(detectIntent("quais minhas mensalidades?")).toBe("get_subscription_analysis");
    });

    it('detecta "quanto gasto com Netflix e Spotify?"', () => {
      expect(detectIntent("quanto gasto com Netflix e Spotify?")).toBe("get_subscription_analysis");
    });

    it('detecta "tenho alguma recorrência ativa?"', () => {
      expect(detectIntent("tenho alguma recorrência ativa?")).toBe("get_subscription_analysis");
    });

    it('detecta "quais são meus planos ativos?"', () => {
      expect(detectIntent("quais são meus planos ativos?")).toBe("get_subscription_analysis");
    });
  });

  describe("get_credit_card_status", () => {
    it('detecta "qual meu limite de cartão?"', () => {
      expect(detectIntent("qual meu limite de cartão?")).toBe("get_credit_card_status");
    });

    it('detecta "quando vence minha fatura?"', () => {
      expect(detectIntent("quando vence minha fatura?")).toBe("get_credit_card_status");
    });

    it('detecta "qual meu crédito disponível?"', () => {
      expect(detectIntent("qual meu crédito disponível?")).toBe("get_credit_card_status");
    });

    it('detecta "qual o status dos meus cartões?"', () => {
      expect(detectIntent("qual o status dos meus cartões?")).toBe("get_credit_card_status");
    });

    it('detecta "quando vence o cartão?"', () => {
      expect(detectIntent("quando vence o cartão?")).toBe("get_credit_card_status");
    });
  });

  describe("prioridade: cartão > assinatura > saldo", () => {
    it("mensagem com 'fatura' e 'saldo' prioriza get_credit_card_status", () => {
      expect(detectIntent("qual o saldo da minha fatura?")).toBe("get_credit_card_status");
    });

    it("mensagem com 'assinatura' e 'mes' prioriza get_subscription_analysis", () => {
      // 'assinatura' aparece antes de 'mes' na ordem de prioridade
      expect(detectIntent("qual o valor da minha assinatura mensal?")).toBe(
        "get_subscription_analysis",
      );
    });
  });

  describe("fallback para intent desconhecida", () => {
    it('retorna "unknown" para saudação simples', () => {
      expect(detectIntent("olá, tudo bem?")).toBe("unknown");
    });

    it('retorna "unknown" para mensagem vazia', () => {
      expect(detectIntent("")).toBe("unknown");
    });

    it('retorna "unknown" para pergunta genérica', () => {
      expect(detectIntent("você pode me ajudar?")).toBe("unknown");
    });

    it('retorna "unknown" para texto sem relação financeira', () => {
      expect(detectIntent("que horas são?")).toBe("unknown");
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: buildMcpArgs
// ---------------------------------------------------------------------------

describe("buildMcpArgs", () => {
  const TENANT = "tenant-abc-123";

  it("get_monthly_balance inclui tenant_id, start_date e end_date", () => {
    const args = buildMcpArgs("get_monthly_balance", TENANT);
    expect(args["tenant_id"]).toBe(TENANT);
    expect(typeof args["start_date"]).toBe("string");
    expect(typeof args["end_date"]).toBe("string");
  });

  it("get_subscription_analysis inclui tenant_id, start_date e end_date", () => {
    const args = buildMcpArgs("get_subscription_analysis", TENANT);
    expect(args["tenant_id"]).toBe(TENANT);
    expect(typeof args["start_date"]).toBe("string");
    expect(typeof args["end_date"]).toBe("string");
  });

  it("get_credit_card_status inclui apenas tenant_id (sem datas)", () => {
    const args = buildMcpArgs("get_credit_card_status", TENANT);
    expect(args["tenant_id"]).toBe(TENANT);
    expect(args["start_date"]).toBeUndefined();
    expect(args["end_date"]).toBeUndefined();
  });

  it("start_date e end_date seguem formato YYYY-MM-DD", () => {
    const args = buildMcpArgs("get_monthly_balance", TENANT);
    expect(args["start_date"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(args["end_date"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// Suite: orchestrateChat
// ---------------------------------------------------------------------------

describe("orchestrateChat", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: ReturnType<typeof spyOn<any, any>>;

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Sucesso: get_monthly_balance
  // -------------------------------------------------------------------------

  it("naturaliza saldo mensal positivo com receitas, despesas e mês", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess(PAYLOAD_MONTHLY_BALANCE_POSITIVO));

    const reply = await orchestrateChat("qual meu saldo do mês?", "tenant-123");

    expect(reply).toContain("maio");
    expect(reply).toContain("2026");
    expect(reply).toContain("R$");
    expect(reply).toContain("positivo");
  });

  it("naturaliza saldo mensal negativo com alerta de gastos", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess(PAYLOAD_MONTHLY_BALANCE_NEGATIVO));

    const reply = await orchestrateChat("qual meu gasto do mês?", "tenant-123");

    expect(reply).toContain("negativo");
    expect(reply).toContain("R$");
  });

  it("retorna mensagem neutra quando não há movimentações no período", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess(JSON.stringify([])));

    const reply = await orchestrateChat("qual meu saldo do mês?", "tenant-123");

    expect(reply).toContain("Ainda não há movimentações");
  });

  // -------------------------------------------------------------------------
  // Sucesso: get_subscription_analysis
  // -------------------------------------------------------------------------

  it("naturaliza análise de assinaturas com total e serviços principais", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess(PAYLOAD_SUBSCRIPTION_ANALYSIS));

    const reply = await orchestrateChat("tenho assinaturas ativas?", "tenant-123");

    expect(reply).toContain("3");
    expect(reply).toContain("R$");
    expect(reply).toContain("Netflix");
  });

  it("menciona assinaturas encerradas quando há serviços parados", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess(PAYLOAD_SUBSCRIPTION_ANALYSIS));

    const reply = await orchestrateChat("tenho mensalidades?", "tenant-123");

    // Payload contém 1 assinatura encerrada (HBO Max)
    expect(reply).toContain("1");
  });

  it("retorna mensagem neutra quando não há assinaturas", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess(PAYLOAD_SUBSCRIPTION_VAZIO));

    const reply = await orchestrateChat("tenho assinaturas?", "tenant-123");

    expect(reply).toContain("Não foram encontradas");
  });

  // -------------------------------------------------------------------------
  // Sucesso: get_credit_card_status
  // -------------------------------------------------------------------------

  it("naturaliza status dos cartões destacando o mais crítico", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess(PAYLOAD_CREDIT_CARD_STATUS));

    const reply = await orchestrateChat("qual meu limite de cartão?", "tenant-123");

    // O cartão crítico é o Itaú Visa (menor crédito disponível)
    expect(reply).toContain("Itaú Visa");
    expect(reply).toContain("R$");
  });

  it("informa quantidade de cartões cadastrados", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess(PAYLOAD_CREDIT_CARD_STATUS));

    const reply = await orchestrateChat("qual o status dos meus cartões?", "tenant-123");

    expect(reply).toContain("2");
  });

  it("retorna mensagem neutra quando não há cartões cadastrados", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess(PAYLOAD_CREDIT_CARD_SEM_CARTOES));

    const reply = await orchestrateChat("qual o status dos meus cartões?", "tenant-123");

    expect(reply).toContain("Nenhum cartão");
  });

  // -------------------------------------------------------------------------
  // Fallback: intent desconhecida
  // -------------------------------------------------------------------------

  it("retorna mensagem de fallback para intent desconhecida sem chamar o MCP", async () => {
    const reply = await orchestrateChat("olá, tudo bem?", "tenant-123");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(reply).toContain("Desculpe");
    expect(reply).toContain("saldo mensal");
  });

  it("fallback para intent desconhecida não expõe detalhes técnicos", async () => {
    const reply = await orchestrateChat("que horas são?", "tenant-123");

    expect(reply).not.toContain("Error");
    expect(reply).not.toContain("stack");
    expect(reply).not.toContain("undefined");
  });

  // -------------------------------------------------------------------------
  // Falhas do MCP
  // -------------------------------------------------------------------------

  it("retorna mensagem de indisponibilidade quando McpTimeoutError (AbortError)", async () => {
    fetchSpy.mockRejectedValueOnce(makeAbortError());

    const reply = await orchestrateChat("qual meu saldo?", "tenant-123");

    expect(reply).toContain("temporariamente indisponível");
  });

  it("retorna mensagem de fallback quando McpToolError (isError: true)", async () => {
    fetchSpy.mockResolvedValueOnce(makeMcpToolErrorResponse("tenant não encontrado"));

    const reply = await orchestrateChat("qual meu saldo?", "tenant-123");

    expect(reply).toContain("Desculpe");
    // Não deve vazar detalhe do erro interno
    expect(reply).not.toContain("tenant não encontrado");
  });

  it("retorna mensagem de fallback quando McpParseError (resposta não é JSON)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("html de erro 502", {
        headers: { "Content-Type": "text/html" },
      }),
    );

    const reply = await orchestrateChat("qual meu saldo?", "tenant-123");

    expect(reply).toContain("Desculpe");
  });

  it("retorna mensagem de indisponibilidade para erro de rede inesperado (ECONNREFUSED)", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const reply = await orchestrateChat("qual meu saldo?", "tenant-123");

    expect(reply).toContain("temporariamente indisponível");
    // Não deve vazar mensagem de erro técnico
    expect(reply).not.toContain("ECONNREFUSED");
  });

  it("payload JSON inválido na naturalização retorna fallback sem expor JSON bruto", async () => {
    // callMcpTool retorna sucesso mas o texto não é JSON válido para o naturalizador
    fetchSpy.mockResolvedValueOnce(makeMcpSuccess("texto livre sem JSON"));

    const reply = await orchestrateChat("qual meu saldo?", "tenant-123");

    expect(reply).toContain("Desculpe");
    // Não deve expor o texto bruto
    expect(reply).not.toContain("texto livre sem JSON");
  });
});
