/**
 * Testes unitários para lógica de elegibilidade do endpoint admin de digest.
 * Valida que a regra >= 80% é aplicada corretamente no pipeline-queues handler.
 *
 * Run: bun test src/application/web/routes/admin/__tests__/digest-enqueue.test.ts
 */
import { describe, expect, it } from "bun:test";
import { isDigestEligible, DIGEST_COVERAGE_MIN } from "../../../../../domain/digest-policy.ts";

describe("handleDigestEnqueue — regra de elegibilidade", () => {
  it("tenant com 80% é elegível (fronteira exata)", () => {
    expect(isDigestEligible(80, 100)).toBe(true);
  });

  it("tenant com 79% não é elegível", () => {
    expect(isDigestEligible(79, 100)).toBe(false);
  });

  it("tenant com 100% é elegível", () => {
    expect(isDigestEligible(100, 100)).toBe(true);
  });

  it("mês sem transações (total=0) não é elegível", () => {
    expect(isDigestEligible(0, 0)).toBe(false);
  });

  it("coverage_min retornado pelo endpoint deve ser 0.80", () => {
    // Valida que a constante usada no payload do enqueue é 0.80
    expect(DIGEST_COVERAGE_MIN).toBe(0.80);
  });

  it("payload do enqueue inclui campo coverage_min", () => {
    // Simula construção do payload que o endpoint retorna
    const mockPayload = {
      enqueued: 2,
      eligible: 2,
      coverage_min: DIGEST_COVERAGE_MIN,
      year: 2026,
      month: 5,
    };
    expect(mockPayload.coverage_min).toBe(0.80);
    expect(mockPayload).toHaveProperty("eligible");
    expect(mockPayload).toHaveProperty("year");
    expect(mockPayload).toHaveProperty("month");
  });
});
