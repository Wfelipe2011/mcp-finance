import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { errorResponse } from "../helpers.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const TRANSACTION_CSV_HEADERS = ["data", "descricao", "categoria", "grupo", "membro", "valor", "tipo"];
const SUMMARY_CSV_HEADERS = ["ano", "mes", "grupo", "total_gasto"];

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toCSV(rows: Record<string, unknown>[], fallbackHeaders?: string[]): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]!) : (fallbackHeaders ?? []);
  const lines = rows.map((r) =>
    headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return "\uFEFF" + [headers.join(","), ...lines].join("\n");
}

export async function handleExportTransactions(
  _req: Request,
  url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const categoryGroup = url.searchParams.get("category_group") ?? undefined;

  if (!dateFrom || !isValidDate(dateFrom) || !dateTo || !isValidDate(dateTo)) {
    return errorResponse(
      "Parâmetros date_from e date_to são obrigatórios no formato YYYY-MM-DD",
      400,
    );
  }

  if (dateFrom > dateTo) {
    return errorResponse("date_from deve ser menor ou igual a date_to", 400);
  }

  const db = new BunPgAdapter(tenantId, sql);
  const rows = await db.getExportTransactions({
    dateFrom,
    dateTo,
    categoryGroup,
    limit: 5001,
  });

  if (rows.length === 5001) {
    return errorResponse(
      "Muitos registros. Reduza o período ou adicione filtro de categoria.",
      422,
    );
  }

  const csv = toCSV(rows as Record<string, unknown>[], TRANSACTION_CSV_HEADERS);
  const filename = `transacoes-${dateFrom}-${dateTo}.csv`;

  return new Response(csv, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function handleExportSummary(
  _req: Request,
  url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const yearStr = url.searchParams.get("year");
  const monthStr = url.searchParams.get("month");
  const format = url.searchParams.get("format") ?? "csv";

  if (format !== "csv" && format !== "html") {
    return errorResponse("Parâmetro format deve ser csv ou html", 400);
  }

  const year = parseInt(yearStr ?? "", 10);
  if (!yearStr || isNaN(year) || year < 2020 || year > 2030) {
    return errorResponse(
      "Parâmetro year é obrigatório e deve ser um inteiro entre 2020 e 2030",
      400,
    );
  }

  const month = monthStr ? parseInt(monthStr, 10) : undefined;
  if (monthStr && (isNaN(month!) || month! < 1 || month! > 12)) {
    return errorResponse("Parâmetro month deve ser um inteiro entre 1 e 12", 400);
  }

  const db = new BunPgAdapter(tenantId, sql);
  const rows = await db.getExportSummary({ year, month });

  if (format === "html") {
    const totalGeral = rows.reduce((sum, row) => sum + Number(row.total_gasto), 0);
    const tableRows =
      rows.length === 0
        ? '<tr><td colspan="3" style="text-align:center;color:#888;">Nenhuma transação no período</td></tr>'
        : rows
            .map(
              (r) =>
                `<tr><td>${r.mes}</td><td>${escapeHtml(r.grupo)}</td><td>R$ ${Number(r.total_gasto).toFixed(2)}</td></tr>`,
            )
            .join("\n");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Resumo Financeiro ${year}${month ? ` — Mês ${month}` : ""}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 2rem; color: #1a1a1a; }
  h1 { font-size: 1.4rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th { background: #f4f4f4; font-weight: 600; }
  th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
  td:last-child { text-align: right; }
  @media print {
    body { margin: 0; padding: 1rem; }
    th { background: #eee !important; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
<h1>Resumo Financeiro ${year}${month ? ` — Mês ${month}` : ""}</h1>
<p><strong>Total geral:</strong> R$ ${totalGeral.toFixed(2)}</p>
<table>
  <thead>
    <tr><th>Mês</th><th>Categoria</th><th>Total</th></tr>
  </thead>
  <tbody>
${tableRows}
  </tbody>
</table>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  // format === "csv" (default)
  const csv = toCSV(rows as Record<string, unknown>[], SUMMARY_CSV_HEADERS);
  const filename = `resumo-${year}${month ? `-${month}` : ""}.csv`;

  return new Response(csv, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
