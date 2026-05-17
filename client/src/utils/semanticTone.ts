export type SemanticTone = "positive" | "negative" | "warning" | "neutral";

export function amountToTone(amount: number): SemanticTone {
  if (amount > 0) return "positive";
  if (amount < 0) return "negative";
  return "neutral";
}

export function runwayDaysToTone(days: number): SemanticTone {
  if (!Number.isFinite(days)) return "neutral";
  if (days >= 60) return "positive";
  if (days >= 30) return "warning";
  return "negative";
}
