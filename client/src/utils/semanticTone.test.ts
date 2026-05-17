import { describe, expect, it } from "bun:test";
import { amountToTone, runwayDaysToTone } from "./semanticTone";

describe("semanticTone", () => {
  it("amountToTone(500) retorna positive", () => {
    expect(amountToTone(500)).toBe("positive");
  });

  it("amountToTone(-200) retorna negative", () => {
    expect(amountToTone(-200)).toBe("negative");
  });

  it("amountToTone(0) retorna neutral", () => {
    expect(amountToTone(0)).toBe("neutral");
  });

  it("runwayDaysToTone(90) retorna positive", () => {
    expect(runwayDaysToTone(90)).toBe("positive");
  });

  it("runwayDaysToTone(15) retorna negative", () => {
    expect(runwayDaysToTone(15)).toBe("negative");
  });
});
