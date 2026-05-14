import { BunPgAdapter } from "../infrastructure/db/BunPgAdapter.ts";
import { generateDigest } from "../infrastructure/ai/digestAgent.ts";

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

function parseMonth(): { year: number; month: number } {
  const idx = process.argv.indexOf("--month");
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error("Uso: bun run digest --month YYYY-MM");
    process.exit(1);
  }
  const raw = process.argv[idx + 1]!;
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    console.error(`Formato inválido: "${raw}". Use YYYY-MM (ex: 2026-02)`);
    process.exit(1);
  }
  return { year: parseInt(match[1]!, 10), month: parseInt(match[2]!, 10) };
}

const db = new BunPgAdapter();
const { year, month } = parseMonth();

console.log(`[digest] Gerando digest para ${year}-${String(month).padStart(2, "0")}...`);

const insights = await db.aiDigests.getMonthInsights(year, month);
const totalCount = await db.aiDigests.getTotalTransactionCount(year, month);
const previousDigests = await db.aiDigests.getPreviousDigests(year, month, 3);

const enrichmentCoverage = totalCount > 0 ? insights.length / totalCount : 0;

if (enrichmentCoverage < 0.5) {
  console.warn(
    `⚠ enrichment_coverage=${(enrichmentCoverage * 100).toFixed(1)}% — considere rodar \`bun run enrich\` antes`
  );
}

console.log(`[digest] ${insights.length}/${totalCount} transações enriquecidas (coverage=${(enrichmentCoverage * 100).toFixed(1)}%)`);

// Calcular métricas localmente, sem delegar ao LLM
const cashflow_real = insights
  .filter((r) => !r.is_debt_related)
  .reduce((sum, r) => sum + Number(r.amount_signed), 0);

const debt_inflows = insights
  .filter((r) => r.is_debt_related && r.transaction_kind === "INCOME")
  .reduce((sum, r) => sum + Math.abs(Number(r.amount_signed)), 0);

const debt_payments = insights
  .filter((r) => r.is_debt_related && r.transaction_kind === "EXPENSE")
  .reduce((sum, r) => sum + Math.abs(Number(r.amount_signed)), 0);

console.log(`[digest] cashflow_real=R$${cashflow_real.toFixed(2)} debt_inflows=R$${debt_inflows.toFixed(2)} debt_payments=R$${debt_payments.toFixed(2)}`);
console.log("[digest] Chamando modelo para narrativa...");

const digestResult = await generateDigest({
  year,
  month,
  cashflow_real,
  debt_inflows,
  debt_payments,
  enrichment_coverage: enrichmentCoverage,
  insights,
  previousDigests,
});

await db.aiDigests.upsert({
  year,
  month,
  cashflow_real,
  debt_inflows,
  debt_payments,
  enrichment_coverage: enrichmentCoverage,
  model_version: AI_MODEL,
  ...digestResult,
});

console.log(
  `✓ Digest ${year}-${String(month).padStart(2, "0")} gerado | cashflow_real=R$${cashflow_real.toFixed(2)} | coverage=${(enrichmentCoverage * 100).toFixed(1)}%`
);

await db.close();
