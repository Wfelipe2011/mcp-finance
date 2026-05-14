const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

export function errorResponse(msg: string, status: number): Response {
  return new Response(JSON.stringify({ error: msg }), { status, headers: CORS_HEADERS });
}

/** Parses a `YYYY-MM` string into `{ year, month }`. Returns null if invalid. */
export function parseMonth(param: string | null): { year: number; month: number } | null {
  if (!param) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(param);
  if (!match) return null;
  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);
  if (month < 1 || month > 12) return null;
  return { year, month };
}
