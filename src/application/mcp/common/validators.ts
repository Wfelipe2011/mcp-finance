/** Validate UUID format (any version) */
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Validate YYYY-MM-DD date format */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/** Validate YYYY-MM month format */
export function isValidMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [y, m] = value.split("-").map(Number);
  return m! >= 1 && m! <= 12 && y! >= 2000 && y! <= 2100;
}

/** Validate limit is an integer in [1, 200] */
export function validateLimit(value: number): string | null {
  if (!Number.isInteger(value) || value < 1 || value > 200) {
    return `limit must be an integer between 1 and 200 (got ${value})`;
  }
  return null;
}

/** Validate threshold is a positive number */
export function validateThreshold(value: number): string | null {
  if (typeof value !== "number" || isNaN(value) || value <= 0) {
    return `threshold must be a positive number (got ${value})`;
  }
  return null;
}

/** Validate that end_date is strictly after start_date */
export function validateDateRange(start: string, end: string): string | null {
  if (start >= end) {
    return `end_date (${end}) must be strictly after start_date (${start})`;
  }
  return null;
}

/** Validate reference_months is in [1, 24] */
export function validateReferenceMonths(value: number): string | null {
  if (!Number.isInteger(value) || value < 1 || value > 24) {
    return `reference_months must be an integer between 1 and 24 (got ${value})`;
  }
  return null;
}
