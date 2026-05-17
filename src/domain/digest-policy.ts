/**
 * Threshold mínimo de cobertura de enriquecimento para elegibilidade de digest.
 * Aplica-se em todos os gates: enqueue manual (admin), cron diário e worker de digest.
 */
export const DIGEST_COVERAGE_MIN = 0.80;

/**
 * Verifica se um tenant é elegível para geração de digest com base na cobertura.
 */
export function isDigestEligible(enriched: number, total: number): boolean {
  if (total === 0) return false;
  return enriched / total >= DIGEST_COVERAGE_MIN;
}
