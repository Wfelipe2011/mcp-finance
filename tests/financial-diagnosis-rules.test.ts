import { describe, it, expect } from "bun:test";
import {
  computeDiagnosis,
  type DiagnosisRawData,
  type DiagnosisCashflowMonth,
} from "../src/application/web/routes/financial-diagnosis.ts";

// ── helpers ────────────────────────────────────────────────────────────────
function makeMonth(
  overrides: Partial<DiagnosisCashflowMonth> & { index?: number },
): DiagnosisCashflowMonth {
  const i = overrides.index ?? 0;
  return {
    year: 2025,
    month: (i % 12) + 1,
    total_receitas: 5000,
    total_despesas: 4000,
    saldo_liquido: 1000,
    total_emprestimos: 0,
    total_receitas_operacionais: 5000,
    ...overrides,
  };
}

function makeData(overrides: Partial<DiagnosisRawData> = {}): DiagnosisRawData {
  const months = Array.from({ length: 12 }, (_, i) => makeMonth({ index: i }));
  return {
    cashflowMonths: months,
    runway: { runway_imediato_meses: 6, runway_total_meses: 12 },
    spendingByGroup: [
      { group_pt: "Moradia", total_gastos: 12000 },
      { group_pt: "Compras", total_gastos: 6000 },
    ],
    installmentCommitmentTotal: 0,
    outlierExpenses: [],
    ...overrides,
  };
}

// ── testes de status / causa ───────────────────────────────────────────────
describe("computeDiagnosis — status healthy", () => {
  it("retorna status healthy quando não há alertas críticos", () => {
    const result = computeDiagnosis(makeData());
    expect(result.status).toBe("healthy");
    expect(result.primary_cause).toBe("none");
    expect(result.rule_version).toBe("1.0.0");
  });

  it("retorna buckets com 4 entradas", () => {
    const result = computeDiagnosis(makeData());
    expect(result.buckets).toHaveLength(4);
    expect(result.buckets.map(b => b.key)).toEqual(["needs", "wants", "debt_goals", "other"]);
  });
});

// ── runway crítico (<30 dias) ──────────────────────────────────────────────
describe("computeDiagnosis — runway crítico", () => {
  it("status urgent quando runway_imediato_meses < 1 (< 30 dias)", () => {
    const data = makeData({
      runway: { runway_imediato_meses: 0.5, runway_total_meses: 2 },
    });
    const result = computeDiagnosis(data);
    expect(result.status).toBe("urgent");
    expect(result.primary_cause).toBe("runway_critical");
  });

  it("alerta runway_critical com severity high", () => {
    const data = makeData({
      runway: { runway_imediato_meses: 0.8, runway_total_meses: 2 },
    });
    const result = computeDiagnosis(data);
    const alert = result.alerts.find(a => a.code === "runway_critical");
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe("high");
  });

  it("status attention quando runway < 3 meses (mas >= 1)", () => {
    const data = makeData({
      runway: { runway_imediato_meses: 2, runway_total_meses: 4 },
    });
    const result = computeDiagnosis(data);
    expect(result.status).toBe("attention");
    const alert = result.alerts.find(a => a.code === "runway_low");
    expect(alert?.severity).toBe("medium");
  });
});

// ── dívida alta (> 20% das saídas) ────────────────────────────────────────
describe("computeDiagnosis — dívida alta", () => {
  it("status attention e alerta high_debt_ratio quando dívida > 20% das saídas", () => {
    const data = makeData({
      spendingByGroup: [
        { group_pt: "Moradia", total_gastos: 8000 },
        { group_pt: "Compras", total_gastos: 5000 },
        { group_pt: "Empréstimos e Financiamentos", total_gastos: 4000 }, // ~28% do total 17000
      ],
    });
    const result = computeDiagnosis(data);
    expect(result.status).toBe("attention");
    const alert = result.alerts.find(a => a.code === "high_debt_ratio");
    expect(alert).toBeDefined();
    expect(result.metrics.debt_ratio).toBeGreaterThan(0.20);
  });

  it("primary_cause = high_debt quando dívida > 30%", () => {
    const data = makeData({
      spendingByGroup: [
        { group_pt: "Moradia", total_gastos: 6000 },
        { group_pt: "Empréstimos e Financiamentos", total_gastos: 6000 }, // 50%
      ],
    });
    const result = computeDiagnosis(data);
    expect(result.primary_cause).toBe("high_debt");
    expect(result.metrics.debt_ratio).toBeGreaterThan(0.30);
  });

  it("ação recomendada aponta para 'credito'", () => {
    const data = makeData({
      spendingByGroup: [
        { group_pt: "Moradia", total_gastos: 8000 },
        { group_pt: "Empréstimos e Financiamentos", total_gastos: 4000 },
      ],
    });
    const result = computeDiagnosis(data);
    const action = result.recommended_actions.find(a => a.destination === "credito");
    expect(action).toBeDefined();
  });
});

// ── déficit sem empréstimos ───────────────────────────────────────────────
describe("computeDiagnosis — déficit operacional sem empréstimos", () => {
  it("conta corretamente meses no déficit sem empréstimos", () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      // primeiros 6 meses: déficit operacional mesmo com empréstimo cobrindo
      const isDeficit = i < 6;
      return makeMonth({
        index: i,
        total_receitas: 6000,
        total_receitas_operacionais: isDeficit ? 3500 : 5000,
        total_emprestimos: isDeficit ? 2500 : 0,
        total_despesas: 4000,
        saldo_liquido: isDeficit ? 2000 : 1000, // positivo pois inclui empréstimo
      });
    });
    const data = makeData({ cashflowMonths: months });
    const result = computeDiagnosis(data);
    expect(result.metrics.negative_months_without_loans).toBe(6);
    expect(result.metrics.negative_months).toBe(0); // saldo com empréstimo é positivo
  });

  it("status urgent quando 9+ meses em déficit operacional", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      makeMonth({
        index: i,
        total_receitas_operacionais: 3000,
        total_emprestimos: 2000,
        total_despesas: 4000,
        saldo_liquido: 1000,
      }),
    );
    const data = makeData({ cashflowMonths: months });
    const result = computeDiagnosis(data);
    expect(result.metrics.negative_months_without_loans).toBe(12);
    expect(result.status).toBe("urgent");
  });

  it("primary_cause = structural_deficit quando >= 6 meses em déficit operacional", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      makeMonth({
        index: i,
        total_receitas_operacionais: i < 7 ? 3000 : 5000,
        total_emprestimos: i < 7 ? 2000 : 0,
        total_despesas: 4000,
        saldo_liquido: 1000,
      }),
    );
    const data = makeData({ cashflowMonths: months });
    const result = computeDiagnosis(data);
    expect(result.primary_cause).toBe("structural_deficit");
  });
});

// ── separação loan_inflows vs operational_income ──────────────────────────
describe("computeDiagnosis — separação empréstimos / receita operacional", () => {
  it("avg_monthly_loan_inflows reflete apenas empréstimos", () => {
    const months = Array.from({ length: 4 }, (_, i) =>
      makeMonth({
        index: i,
        total_receitas: 6000,
        total_receitas_operacionais: 4000,
        total_emprestimos: 2000,
      }),
    );
    const data = makeData({ cashflowMonths: months });
    const result = computeDiagnosis(data);
    expect(result.metrics.avg_monthly_loan_inflows).toBe(2000);
    expect(result.metrics.avg_monthly_income_operational).toBe(4000);
    expect(result.metrics.avg_monthly_income).toBe(6000);
    expect(result.metrics.loan_inflows).toBe(8000);
    expect(result.metrics.operational_income).toBe(16000);
  });
});

// ── isolamento tenant-scoped ───────────────────────────────────────────────
describe("isolamento tenant-scoped", () => {
  it("getFinancialDiagnosisData configura app.tenant_id antes das consultas", async () => {
    const { BunPgAdapter } = await import(
      "../src/infrastructure/db/BunPgAdapter.ts"
    );
    const calls: string[] = [];
    const fakeQuery = async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join("?").replace(/\s+/g, " ").trim();
      calls.push(query);
      if (query.includes("set_config('app.tenant_id'")) {
        expect(values[0]).toBe("tenant-test-id");
        return [];
      }
      if (query.includes("FROM cube_cashflow_mensal")) return [];
      if (query.includes("FROM kpi_runway_imediato")) return [];
      if (query.includes("FROM kpi_runway_total")) return [];
      if (query.includes("FROM cube_gastos_grupo_mensal")) return [];
      if (query.includes("FROM cube_compromissos_ativos")) return [{ total: "0" }];
      if (query.includes("FROM f_fluxo_caixa")) return [];
      return [];
    };
    Object.defineProperty(fakeQuery, "begin", {
      value: async (fn: (q: typeof fakeQuery) => Promise<unknown>) => fn(fakeQuery),
    });

    const adapter = new BunPgAdapter("tenant-test-id", fakeQuery as never);
    const result = await adapter.getFinancialDiagnosisData();

    expect(result.cashflowMonths).toEqual([]);
    expect(calls[0]).toContain("set_config('app.tenant_id'");
    expect(calls.some(call => call.includes("FROM cube_cashflow_mensal"))).toBe(true);
  });
});

// ── métricas de buckets ────────────────────────────────────────────────────
describe("computeDiagnosis — buckets 50/30/20", () => {
  it("income_ratio reflete proporção correta em relação à renda operacional", () => {
    // renda operacional = 5000/mês; needs = 12000/12 = 1000/mês → ratio = 0.20
    const data = makeData({
      spendingByGroup: [
        { group_pt: "Moradia", total_gastos: 12000 },
      ],
    });
    const result = computeDiagnosis(data);
    const needs = result.buckets.find(b => b.key === "needs");
    expect(needs?.monthly_amount).toBe(1000);
    expect(needs?.income_ratio).toBe(0.2);
    expect(needs?.target_ratio).toBe(0.5);
    expect(needs?.target_delta).toBe(-0.3); // abaixo do target (bom)
  });

  it("target_delta positivo indica excesso sobre a meta", () => {
    // wants = 36000/12 = 3000/mês; income = 5000; ratio = 0.60; target = 0.30 → delta = 0.30
    const data = makeData({
      spendingByGroup: [
        { group_pt: "Compras", total_gastos: 36000 },
      ],
    });
    const result = computeDiagnosis(data);
    const wants = result.buckets.find(b => b.key === "wants");
    expect(wants?.target_delta).toBeGreaterThan(0);
  });
});

// ── histórico insuficiente ─────────────────────────────────────────────────
describe("computeDiagnosis — histórico insuficiente", () => {
  it("não falha com 0 meses — retorna buckets vazios e alerta", () => {
    const data = makeData({ cashflowMonths: [] });
    const result = computeDiagnosis(data);
    expect(result.status).toBe("healthy");
    const alert = result.alerts.find(a => a.code === "insufficient_history");
    expect(alert).toBeDefined();
    expect(result.buckets).toEqual([]);
  });

  it("não falha com 1 mês de dados", () => {
    const data = makeData({ cashflowMonths: [makeMonth({ index: 0 })] });
    const result = computeDiagnosis(data);
    expect(result.status).toBeDefined();
    expect(result.metrics.total_months_analyzed).toBe(1);
  });
});

// ── outliers ───────────────────────────────────────────────────────────────
describe("computeDiagnosis — outliers", () => {
  it("inclui métricas e alerta para gastos atípicos", () => {
    const result = computeDiagnosis(makeData({
      outlierExpenses: [
        {
          description: "Compra atípica",
          category_pt: "Compras online",
          group_pt: "Compras",
          amount: 1500,
          date_day: "2026-04-12",
        },
      ],
    }));

    expect(result.metrics.outlier_expense_count).toBe(1);
    expect(result.metrics.outlier_expense_total).toBe(1500);
    expect(result.alerts.some(alert => alert.code === "expense_outliers")).toBe(true);
  });
});

// ── detail_links ──────────────────────────────────────────────────────────
describe("computeDiagnosis — detail_links", () => {
  it("retorna todos os destinos semânticos esperados", () => {
    const result = computeDiagnosis(makeData());
    expect(result.detail_links).toMatchObject({
      gastos: "/gastos",
      credito: "/credito",
      metas: "/metas",
      orcamento: "/orcamento",
      resumo: "/",
    });
  });
});
