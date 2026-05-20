import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { generateDigest } from "../../../infrastructure/ai/digestAgent.ts";
import { isDigestEligible } from "../../../domain/digest-policy.ts";

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

export interface DigestPayload {
  year: number;
  month: number;
}

export type HandlerResult =
  | { result: "done" }
  | { result: "skipped" }
  | { result: "error"; error: string };

export async function handleDigest(
  _db: BunPgAdapter,
  tenantId: string,
  payload: DigestPayload,
): Promise<HandlerResult> {
  const { year, month } = payload;
  if (!year || !month) {
    return { result: "error", error: "payload missing year or month" };
  }

  const dbTenant = new BunPgAdapter(tenantId);
  try {
    const coverage = await dbTenant.getDigestCoverage(year, month);

    if (!isDigestEligible(coverage.enriched, coverage.total)) {
      return { result: "skipped" };
    }

    const insights = await dbTenant.aiDigests.getMonthInsights(year, month);
    const previousDigests = await dbTenant.aiDigests.getPreviousDigests(year, month, 3);
    const activeGoals = await dbTenant.goals.getActiveForDigest();
    const budgetAlerts = await dbTenant.budgets.getExceededOrWarning();

    const cashflow_real = insights
      .filter((r) => !r.is_debt_related)
      .reduce((sum, r) => sum + Number(r.amount_signed), 0);

    const debt_inflows = insights
      .filter((r) => r.is_debt_related && r.transaction_kind === "INCOME")
      .reduce((sum, r) => sum + Math.abs(Number(r.amount_signed)), 0);

    const debt_payments = insights
      .filter((r) => r.is_debt_related && r.transaction_kind === "EXPENSE")
      .reduce((sum, r) => sum + Math.abs(Number(r.amount_signed)), 0);

    const enrichment_coverage = coverage.total > 0 ? coverage.enriched / coverage.total : 0;

    const digestResult = await generateDigest({
      year,
      month,
      cashflow_real,
      debt_inflows,
      debt_payments,
      enrichment_coverage,
      insights,
      previousDigests,
      activeGoals,
      budgetAlerts,
    });

    await dbTenant.upsertDigest(year, month, {
      year,
      month,
      cashflow_real,
      debt_inflows,
      debt_payments,
      enrichment_coverage,
      model_version: AI_MODEL,
      ...digestResult,
    });

    return { result: "done" };
  } catch (err) {
    return { result: "error", error: err instanceof Error ? err.message : String(err) };
  } finally {
    await dbTenant.close();
  }
}
