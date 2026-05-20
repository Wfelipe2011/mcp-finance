import { describe, expect, it, mock, afterEach } from "bun:test";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { FinancialPriorityCard } from "./FinancialPriorityCard.tsx";
import type { FinancialDiagnosis, InsightToday } from "../api/types.ts";

afterEach(() => cleanup());

// Mocks mínimos de CSS vars — happy-dom ignora, mas os data-* attrs são verificáveis

const baseDiagnosis: FinancialDiagnosis = {
  status: "urgent",
  primary_cause: "Despesas superam receitas há 3 meses consecutivos",
  metrics: {
    operational_income: 5000,
    loan_inflows: 500,
    avg_monthly_income: 5000,
    avg_monthly_income_operational: 4800,
    avg_monthly_expenses: 5800,
    avg_monthly_balance: -800,
    avg_monthly_loan_inflows: 500,
    negative_months: 3,
    negative_months_without_loans: 4,
    total_months_analyzed: 6,
    runway_imediato_meses: 1.2,
    runway_total_meses: 2.5,
    debt_ratio: 0.35,
    installment_commitment_total: 0.28,
    outlier_expense_count: 2,
    outlier_expense_total: 1200,
  },
  buckets: [],
  alerts: [],
  recommended_actions: [
    {
      title: "Reduzir gastos com delivery",
      reason: "Categoria acima do limite 50/30/20",
      estimated_monthly_impact: 400,
      destination: "gastos",
    },
  ],
  detail_links: {
    gastos: "/gastos",
    credito: "/credito",
    metas: "/metas",
    orcamento: "/orcamento",
    resumo: "/resumo",
  },
  rule_version: "1.0",
};

function makeDiagnosis(overrides: Partial<FinancialDiagnosis>): FinancialDiagnosis {
  return { ...baseDiagnosis, ...overrides };
}

describe("FinancialPriorityCard", () => {
  describe("status urgente", () => {
    it("renderiza o card com data-status=urgent", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({ status: "urgent" })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      const card = screen.getByTestId("financial-priority-card");
      expect(card.getAttribute("data-status")).toBe("urgent");
    });

    it("exibe a causa principal", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({ status: "urgent" })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      expect(screen.getByText("Despesas superam receitas há 3 meses consecutivos")).toBeTruthy();
    });

    it("exibe label amigável para causas versionadas", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({ status: "urgent", primary_cause: "structural_deficit" })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      expect(screen.getByText(/déficit operacional recorrente/i)).toBeTruthy();
    });

    it("exibe o label de atenção urgente", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({ status: "urgent" })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      expect(screen.getByText(/atenção urgente/i)).toBeTruthy();
    });

    it("exibe runway quando disponível", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({ status: "urgent" })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      expect(screen.getByText(/runway/i)).toBeTruthy();
      expect(screen.getByText(/1\.2 meses/)).toBeTruthy();
    });
  });

  describe("status atenção", () => {
    it("renderiza o card com data-status=attention", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({ status: "attention" })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      const card = screen.getByTestId("financial-priority-card");
      expect(card.getAttribute("data-status")).toBe("attention");
    });

    it("exibe o label de ponto de atenção", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({ status: "attention" })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      expect(screen.getByText(/ponto de atenção/i)).toBeTruthy();
    });
  });

  describe("status saudável", () => {
    it("renderiza o card com data-status=healthy", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({ status: "healthy", primary_cause: "Finanças equilibradas" })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      const card = screen.getByTestId("financial-priority-card");
      expect(card.getAttribute("data-status")).toBe("healthy");
    });

    it("exibe botão 'Ver plano' para status saudável", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({ status: "healthy", primary_cause: "Finanças equilibradas" })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      expect(screen.getByText(/ver plano/i)).toBeTruthy();
    });

    it("navega para plano em status saudável mesmo com ação de orçamento", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={makeDiagnosis({
            status: "healthy",
            primary_cause: "none",
            recommended_actions: [{
              title: "Monitorar orçamento por categoria",
              reason: "Manter controle preventivo.",
              estimated_monthly_impact: 0,
              destination: "orcamento",
            }],
          })}
          insight={null}
          onNavigateTo={onNavigateTo}
        />,
      );

      fireEvent.click(screen.getByText(/ver plano/i));
      expect(onNavigateTo).toHaveBeenCalledWith("plano");
    });
  });

  describe("fallback — diagnóstico indisponível com insight", () => {
    it("exibe o insight como fallback quando diagnóstico falha", () => {
      const onNavigateTo = mock(() => {});
      const insight: InsightToday = {
        type: "daily",
        text: "Seus gastos com alimentação estão dentro do esperado.",
        score: 0.82,
      };

      render(
        <FinancialPriorityCard
          diagnosis={null}
          insight={insight}
          onNavigateTo={onNavigateTo}
          diagnosisUnavailable={true}
        />,
      );

      const card = screen.getByTestId("financial-priority-card");
      expect(card.getAttribute("data-status")).toBe("fallback-insight");
      expect(screen.getByText("Seus gastos com alimentação estão dentro do esperado.")).toBeTruthy();
    });

    it("exibe mensagem discreta de indisponibilidade", () => {
      const onNavigateTo = mock(() => {});
      const insight: InsightToday = {
        type: "daily",
        text: "Texto qualquer.",
      };

      render(
        <FinancialPriorityCard
          diagnosis={null}
          insight={insight}
          onNavigateTo={onNavigateTo}
          diagnosisUnavailable={true}
        />,
      );

      expect(screen.getByText(/diagnóstico indisponível/i)).toBeTruthy();
    });
  });

  describe("fallback — sem diagnóstico e sem insight", () => {
    it("não renderiza nada quando não há dados e não houve erro", () => {
      const onNavigateTo = mock(() => {});
      const { container } = render(
        <FinancialPriorityCard
          diagnosis={null}
          insight={null}
          onNavigateTo={onNavigateTo}
          diagnosisUnavailable={false}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("exibe mensagem discreta de indisponibilidade sem insight", () => {
      const onNavigateTo = mock(() => {});
      render(
        <FinancialPriorityCard
          diagnosis={null}
          insight={null}
          onNavigateTo={onNavigateTo}
          diagnosisUnavailable={true}
        />,
      );

      const card = screen.getByTestId("financial-priority-card");
      expect(card.getAttribute("data-status")).toBe("unavailable");
      expect(screen.getByText(/diagnóstico financeiro indisponível/i)).toBeTruthy();
    });
  });
});
