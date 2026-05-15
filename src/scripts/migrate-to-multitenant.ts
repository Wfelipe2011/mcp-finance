/**
 * migrate-to-multitenant.ts
 *
 * Script único de migração single-tenant → multi-tenant.
 *
 * O que faz:
 *  1. Lê env vars do tenant legado (APP_USERNAME, APP_PASSWORD, PLUGGY_EMAIL, PLUGGY_PASSWORD)
 *  2. Cria um registro em `tenants` com esses dados (bcrypt no password)
 *  3. Popula `tenant_id` em todas as tabelas de dados (WHERE tenant_id IS NULL)
 *
 * Pré-requisitos:
 *  - Schema já aplicado com as novas tabelas e colunas tenant_id (nullable)
 *  - DATABASE_URL configurado
 *  - APP_USERNAME, APP_PASSWORD, PLUGGY_EMAIL, PLUGGY_PASSWORD no env
 *
 * Como executar:
 *  bun run src/scripts/migrate-to-multitenant.ts
 *
 * Rollback: as colunas tenant_id podem ser dropadas individualmente.
 * As novas tabelas (tenants, workers, enrich_jobs, tenant_members) podem ser
 * dropadas sem afetar dados existentes.
 */

import { SQL } from "bun";

const DATABASE_URL = process.env["DATABASE_URL"];
const APP_USERNAME = process.env["APP_USERNAME"];
const APP_PASSWORD = process.env["APP_PASSWORD"];
const PLUGGY_EMAIL = process.env["PLUGGY_EMAIL"];
const PLUGGY_PASSWORD = process.env["PLUGGY_PASSWORD"];
const APP_NAME = process.env["APP_NAME"] ?? "Família";

if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");
if (!APP_USERNAME) throw new Error("APP_USERNAME is not set");
if (!APP_PASSWORD) throw new Error("APP_PASSWORD is not set");

const sql = new SQL(DATABASE_URL);

async function main() {
  console.log("Starting migration to multi-tenant...\n");

  await sql.begin(async (tx) => {
    // ─── 1. Hash the app password using bcrypt ─────────────────────────────
    // Use Bun's built-in password hashing
    const passwordHash = await Bun.password.hash(APP_PASSWORD!, {
      algorithm: "bcrypt",
      cost: 12,
    });

    // ─── 2. Create initial tenant ──────────────────────────────────────────
    console.log(`Creating tenant for: ${APP_USERNAME}`);
    const [tenant] = await tx<{ id: string }[]>`
      INSERT INTO tenants (name, email, password_hash, pluggy_email, pluggy_password, status)
      VALUES (
        ${APP_NAME},
        ${APP_USERNAME!},
        ${passwordHash},
        ${PLUGGY_EMAIL ?? null},
        ${PLUGGY_PASSWORD ?? null},
        'active'
      )
      ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            pluggy_email = EXCLUDED.pluggy_email,
            pluggy_password = EXCLUDED.pluggy_password
      RETURNING id
    `;

    if (!tenant) throw new Error("Failed to create or find tenant");
    const tenantId = tenant.id;
    console.log(`Tenant ID: ${tenantId}\n`);

    // ─── 3. Back-fill tenant_id in all data tables ─────────────────────────
    const tables = [
      "items",
      "accounts",
      "transactions",
      "investments",
      "investment_transactions",
      "category_overrides",
      "transactions_enriched",
    ];

    for (const table of tables) {
      const result = await tx.unsafe(
        `UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL`,
        [tenantId],
      );
      const count = (result as unknown as { count: number }).count ?? 0;
      console.log(`  ${table}: updated ${count} rows`);
    }

    // ─── 4. Back-fill ai tables (gold-ai.sql) ─────────────────────────────
    const aiTables = ["ai_transaction_insights", "ai_monthly_digest"];
    for (const table of aiTables) {
      const result = await tx.unsafe(
        `UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL`,
        [tenantId],
      );
      const count = (result as unknown as { count: number }).count ?? 0;
      console.log(`  ${table}: updated ${count} rows`);
    }

    console.log("\nMigration complete.");
    console.log(
      "\nNext step: add NOT NULL constraint to tenant_id columns after verifying data.",
    );
    console.log("  ALTER TABLE items ALTER COLUMN tenant_id SET NOT NULL;");
    console.log("  (repeat for each table)");
  });

  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
