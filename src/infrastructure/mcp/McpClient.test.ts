/**
 * Testes unitários para McpClient.
 * Cobre os cenários: sucesso, timeout, resposta malformada e erro retornado pela tool.
 *
 * Run: bun test src/infrastructure/mcp/McpClient.test.ts
 */
import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import {
  callMcpTool,
  McpTimeoutError,
  McpParseError,
  McpToolError,
} from "./McpClient.ts";

// ---------------------------------------------------------------------------
// Helpers de resposta JSON-RPC
// ---------------------------------------------------------------------------

function makeSuccessResponse(toolName: string, text: string): Response {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    result: {
      content: [{ type: "text", text }],
      isError: false,
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function makeToolErrorResponse(toolName: string, errorText: string): Response {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    result: {
      content: [{ type: "text", text: errorText }],
      isError: true,
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function makeJsonRpcErrorResponse(message: string): Response {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    error: { code: -32601, message },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// AbortError que simula o disparo do AbortController após o timeout
function makeAbortError(): Error {
  return Object.assign(new Error("The operation was aborted."), {
    name: "AbortError",
  });
}

// ---------------------------------------------------------------------------
// Suite de testes
// ---------------------------------------------------------------------------

describe("callMcpTool", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: ReturnType<typeof spyOn<any, any>>;

  beforeEach(() => {
    // Substitui fetch global por um spy sem implementação padrão
    fetchSpy = spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Sucesso
  // -------------------------------------------------------------------------

  it("retorna o texto de content[0].text em uma resposta de sucesso", async () => {
    const expectedText = '{"balance":1234.56}';
    fetchSpy.mockResolvedValueOnce(
      makeSuccessResponse("get_monthly_balance", expectedText),
    );

    const result = await callMcpTool("get_monthly_balance", {
      tenant_id: "t1",
      start_date: "2026-05-01",
      end_date: "2026-05-31",
    });

    expect(result).toBe(expectedText);
  });

  it("envia POST para a URL MCP com payload JSON-RPC correto", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeSuccessResponse("get_monthly_balance", "{}"),
    );

    await callMcpTool("get_monthly_balance", { tenant_id: "abc" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;

    expect(body["jsonrpc"]).toBe("2.0");
    expect(body["method"]).toBe("tools/call");
    expect((body["params"] as Record<string, unknown>)["name"]).toBe(
      "get_monthly_balance",
    );
  });

  // -------------------------------------------------------------------------
  // Timeout
  // -------------------------------------------------------------------------

  it("lança McpTimeoutError quando fetch rejeita com AbortError", async () => {
    fetchSpy.mockRejectedValueOnce(makeAbortError());

    await expect(
      callMcpTool("get_monthly_balance", { tenant_id: "t1" }),
    ).rejects.toBeInstanceOf(McpTimeoutError);
  });

  it("McpTimeoutError contém o nome da tool na mensagem", async () => {
    fetchSpy.mockRejectedValueOnce(makeAbortError());

    const err = await callMcpTool("get_subscription_analysis", {
      tenant_id: "t1",
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(McpTimeoutError);
    expect((err as McpTimeoutError).message).toContain(
      "get_subscription_analysis",
    );
  });

  it("relança erros de rede que não são AbortError", async () => {
    const networkError = new Error("ECONNREFUSED");
    fetchSpy.mockRejectedValueOnce(networkError);

    await expect(
      callMcpTool("get_monthly_balance", { tenant_id: "t1" }),
    ).rejects.toThrow("ECONNREFUSED");
  });

  // -------------------------------------------------------------------------
  // Resposta malformada → McpParseError
  // -------------------------------------------------------------------------

  it("lança McpParseError quando a resposta não é JSON válido", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("html de erro 502", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    await expect(
      callMcpTool("get_monthly_balance", { tenant_id: "t1" }),
    ).rejects.toBeInstanceOf(McpParseError);
  });

  it("lança McpParseError quando result está ausente na resposta", async () => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1 });
    fetchSpy.mockResolvedValueOnce(
      new Response(body, {
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      callMcpTool("get_monthly_balance", { tenant_id: "t1" }),
    ).rejects.toBeInstanceOf(McpParseError);
  });

  it("lança McpParseError quando result.content é array vazio", async () => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { content: [], isError: false },
    });
    fetchSpy.mockResolvedValueOnce(
      new Response(body, {
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      callMcpTool("get_monthly_balance", { tenant_id: "t1" }),
    ).rejects.toBeInstanceOf(McpParseError);
  });

  it("lança McpParseError quando content[0].text não é string", async () => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: {
        content: [{ type: "image", data: "base64..." }],
        isError: false,
      },
    });
    fetchSpy.mockResolvedValueOnce(
      new Response(body, {
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      callMcpTool("get_monthly_balance", { tenant_id: "t1" }),
    ).rejects.toBeInstanceOf(McpParseError);
  });

  it("McpParseError contém o nome da tool na mensagem", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("não-é-json", {
        headers: { "Content-Type": "application/json" },
      }),
    );

    const err = await callMcpTool("minha_tool", { tenant_id: "t1" }).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(McpParseError);
    expect((err as McpParseError).message).toContain("minha_tool");
  });

  // -------------------------------------------------------------------------
  // Erro retornado pela tool
  // -------------------------------------------------------------------------

  it("lança McpToolError quando isError é true no resultado", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeToolErrorResponse("get_monthly_balance", "tenant não encontrado"),
    );

    await expect(
      callMcpTool("get_monthly_balance", { tenant_id: "inexistente" }),
    ).rejects.toBeInstanceOf(McpToolError);
  });

  it("McpToolError contém o texto de erro da tool na mensagem", async () => {
    const errorText = "data de início inválida";
    fetchSpy.mockResolvedValueOnce(
      makeToolErrorResponse("get_monthly_balance", errorText),
    );

    const err = await callMcpTool("get_monthly_balance", {
      tenant_id: "t1",
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(McpToolError);
    expect((err as McpToolError).message).toContain(errorText);
  });

  it("lança McpToolError quando o envelope JSON-RPC contém campo error", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeJsonRpcErrorResponse("Method not found"),
    );

    await expect(
      callMcpTool("tool_inexistente", { tenant_id: "t1" }),
    ).rejects.toBeInstanceOf(McpToolError);
  });

  it("McpToolError do envelope JSON-RPC contém a mensagem de erro original", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeJsonRpcErrorResponse("tool_inexistente not registered"),
    );

    const err = await callMcpTool("tool_inexistente", {
      tenant_id: "t1",
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(McpToolError);
    expect((err as McpToolError).message).toContain(
      "tool_inexistente not registered",
    );
  });
});
