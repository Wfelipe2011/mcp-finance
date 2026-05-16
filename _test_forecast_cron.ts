import { BunPgAdapter } from './src/infrastructure/db/BunPgAdapter.ts';
import { generateForecastMessage } from './src/infrastructure/ai/forecastAgent.ts';

const AI_MODEL = process.env["AI_MODEL"] ?? 'gemma-4';

const rootDb = new BunPgAdapter();
const tenantIds = await rootDb.getActiveTenantsIds();
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const today = now.toISOString().slice(0, 10);

console.log('[test] tenants:', tenantIds.length, '| date:', today);

for (const tenantId of tenantIds) {
  const db = new BunPgAdapter(tenantId);
  const predictions = await db.forecast.getPredictionsByGroup();
  console.log('[test] tenant', tenantId.slice(0, 8), '| predictions:', predictions.length);

  if (predictions.length === 0) {
    console.log('  → skipped (no predictions)');
    continue;
  }

  const spending = await db.forecast.getCurrentMonthSpendingByGroup();
  console.log('  spending groups:', spending.length);

  const message = await generateForecastMessage({ currentYear, currentMonth, spending, predictions });
  console.log('  message:', message);

  await db.forecast.saveDailyMessage(today, message, { currentYear, currentMonth }, AI_MODEL);
  console.log('  → saved');
}

// Verify getDailyMessage
const db0 = new BunPgAdapter(tenantIds[0]!);
const msg = await db0.forecast.getDailyMessage(today);
console.log('[test] getDailyMessage for tenant[0]:', msg ? 'found' : 'NOT FOUND');
if (msg) console.log('  message_pt:', msg.message_pt);

// Task 6.4: confirm skip when tenant has no predictions
// (covered above — getPredictionsByGroup returns [] → skipped)

process.exit(0);
