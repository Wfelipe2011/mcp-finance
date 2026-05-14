import { BunPgAdapter } from "../infrastructure/db/BunPgAdapter.ts";
import { enrichTransaction } from "../infrastructure/ai/enrichAgent.ts";

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

function parseLimit(): number {
  const idx = process.argv.indexOf("--limit");
  if (idx !== -1 && process.argv[idx + 1]) {
    const val = parseInt(process.argv[idx + 1]!, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 2;
}

const db = new BunPgAdapter();
const limit = parseLimit();

console.log(`[enrich] Buscando até ${limit} transações não-enriquecidas...`);

const transactions = await db.aiInsights.getUnenriched(limit);

if (transactions.length === 0) {
  console.log("[enrich] Nenhuma transação pendente. processed_count=0 error_count=0");
  await db.close();
  process.exit(0);
}

console.log(`[enrich] ${transactions.length} transações encontradas. Iniciando enrichment...`);

let processedCount = 0;
let errorCount = 0;
console.time("1000")
for (let i = 0; i < transactions.length; i++) {
  const tx = transactions[i]!;
  try {
    const insight = await enrichTransaction(tx);
    if (!insight) {
      console.error(`✗ [${i + 1}/${transactions.length}] ${tx.description.slice(0, 50)} → AI não retornou estrutura válida`);
      errorCount++;
      continue;
    }
    await db.aiInsights.upsertOne({
      transaction_id: tx.transaction_id,
      model_version: AI_MODEL,
      ...insight,
    });
    processedCount++;
    console.log(
      `✓ [${i + 1}/${transactions.length}] ${tx.description.slice(0, 50)} → merchant=${insight.merchant_name ?? "?"} debt=${insight.is_debt_related}`
    );
  } catch (err) {
    errorCount++;
    console.error(`✗ [${i + 1}/${transactions.length}] ${tx.description.slice(0, 50)} → erro:`, err instanceof Error ? err.message : err);
  }
}
console.timeEnd("1000")
console.log(`\n[enrich] Concluído. processed_count=${processedCount} error_count=${errorCount}`);

await db.close();
if (errorCount > 0) process.exit(1);
