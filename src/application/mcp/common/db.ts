import type { SQL } from "bun";
import { isValidUUID } from "./validators.ts";

/** Run a SQL function in a tenant-scoped transaction */
export async function withTenant<T>(
  sql: SQL,
  tenantId: string,
  fn: (tx: SQL) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

/** Validate that a tenant_id is a valid UUID and the tenant is active.
 *  Returns null on success, or an error message on failure.
 */
export async function validateTenant(
  sql: SQL,
  tenantId: string,
): Promise<string | null> {
  if (!tenantId || !isValidUUID(tenantId)) {
    return "tenant_id is required and must be a valid UUID";
  }
  const rows = await sql<{ status: string }[]>`
    SELECT status FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1
  `;
  if (rows.length === 0) return `tenant not found: ${tenantId}`;
  if (rows[0]!.status !== "active") return `tenant is not active: ${tenantId}`;
  return null;
}
