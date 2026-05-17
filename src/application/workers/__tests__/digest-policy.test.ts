import { describe, expect, it } from "bun:test";
import { isDigestEligible, DIGEST_COVERAGE_MIN } from "../../../domain/digest-policy.ts";

describe("isDigestEligible — gate de cobertura do digest", () => {
  it("constante deve ser 0.80", () => {
    expect(DIGEST_COVERAGE_MIN).toBe(0.80);
  });

  it("79% de cobertura não é elegível", () => {
    expect(isDigestEligible(79, 100)).toBe(false);
  });

  it("80% de cobertura é elegível (fronteira inclusive)", () => {
    expect(isDigestEligible(80, 100)).toBe(true);
  });

  it("100% de cobertura é elegível", () => {
    expect(isDigestEligible(100, 100)).toBe(true);
  });

  it("mês sem transações (total=0) não é elegível", () => {
    expect(isDigestEligible(0, 0)).toBe(false);
  });

  it("87/88 ≈ 98.8% é elegível", () => {
    expect(isDigestEligible(87, 88)).toBe(true);
  });

  it("79/100 é inelegível", () => {
    expect(isDigestEligible(79, 100)).toBe(false);
  });

  it("1/1 = 100% é elegível", () => {
    expect(isDigestEligible(1, 1)).toBe(true);
  });
});
