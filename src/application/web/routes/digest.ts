import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse, parseMonth } from "../helpers.ts";

export async function handleDigest(_req: Request, url: URL, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  const parsed = parseMonth(url.searchParams.get("month"));
  if (!parsed) return errorResponse("Invalid month format. Use YYYY-MM", 400);

  const [coverage, data] = await Promise.all([
    db.getDigestCoverage(parsed.year, parsed.month),
    db.getDigestData(parsed.year, parsed.month),
  ]);

  if (!data) {
    const coverageRatio = coverage.total > 0 ? coverage.enriched / coverage.total : 0;
    return jsonResponse({ status: "pending", coverage: coverageRatio });
  }

  return jsonResponse({ status: "ready", data });
}
