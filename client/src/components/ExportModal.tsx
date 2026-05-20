import { useState } from "react";
import { buildExportUrl, fetchCsvExport, openHtmlExport } from "../api/client.ts";

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateFrom?: string;
  initialDateTo?: string;
  /** Lista de grupos disponíveis para filtro (reutiliza dados já carregados na tela) */
  grupos?: string[];
}

type ExportFormat = "transactions-csv" | "summary-csv" | "summary-html";

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function ExportModal({
  isOpen,
  onClose,
  initialDateFrom,
  initialDateTo,
  grupos = [],
}: ExportModalProps) {
  const defaults = getMonthRange();
  const [dateFrom, setDateFrom] = useState(initialDateFrom ?? defaults.from);
  const [dateTo, setDateTo] = useState(initialDateTo ?? defaults.to);
  const [categoryGroup, setCategoryGroup] = useState("");
  const [format, setFormat] = useState<ExportFormat>("transactions-csv");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirm() {
    setErrorMsg(null);
    setLoading(true);
    try {
      if (format === "transactions-csv") {
        const params: Record<string, string> = { date_from: dateFrom, date_to: dateTo };
        if (categoryGroup) params["category_group"] = categoryGroup;
        const url = buildExportUrl("transactions", params);
        const filename = `transacoes-${dateFrom}-${dateTo}.csv`;
        const err = await fetchCsvExport(url, filename);
        if (err) {
          setErrorMsg(err);
          return;
        }
        onClose();
      } else if (format === "summary-csv") {
        const year = dateFrom.slice(0, 4);
        const params: Record<string, string> = { year, format: "csv" };
        const url = buildExportUrl("summary", params);
        const filename = `resumo-${year}.csv`;
        const err = await fetchCsvExport(url, filename);
        if (err) {
          setErrorMsg(err);
          return;
        }
        onClose();
      } else {
        const year = dateFrom.slice(0, 4);
        const url = buildExportUrl("summary", { year, format: "html" });
        const err = await openHtmlExport(url);
        if (err) {
          setErrorMsg(err);
          return;
        }
        onClose();
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao exportar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: "var(--space-md)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Exportar dados"
        style={{
          width: "100%",
          maxWidth: 460,
          backgroundColor: "var(--color-surface-card)",
          border: "1px solid var(--color-border-hairline)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-md)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-md)",
          }}
        >
          <h3
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Exportar dados
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.25rem",
              color: "var(--color-muted)",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Format */}
        <div style={{ marginBottom: "var(--space-sm)" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--color-text-body)",
              marginBottom: "0.25rem",
            }}
          >
            Formato
          </label>
          <select
            className="input input-sm input-bordered w-full"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as ExportFormat);
              setErrorMsg(null);
              setCategoryGroup("");
            }}
          >
            <option value="transactions-csv">CSV — Transações brutas</option>
            <option value="summary-csv">CSV — Resumo por categoria</option>
            <option value="summary-html">HTML — Resumo para impressão (PDF)</option>
          </select>
        </div>

        {/* Date range */}
        <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--color-text-body)",
                marginBottom: "0.25rem",
              }}
            >
              De
            </label>
            <input
              type="date"
              className="input input-sm input-bordered w-full"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setErrorMsg(null);
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--color-text-body)",
                marginBottom: "0.25rem",
              }}
            >
              Até
            </label>
            <input
              type="date"
              className="input input-sm input-bordered w-full"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setErrorMsg(null);
              }}
            />
          </div>
        </div>

        {/* Category filter — only for transactions-csv */}
        {format === "transactions-csv" && grupos.length > 0 && (
          <div style={{ marginBottom: "var(--space-sm)" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--color-text-body)",
                marginBottom: "0.25rem",
              }}
            >
              Filtrar por grupo (opcional)
            </label>
            <select
              className="input input-sm input-bordered w-full"
              value={categoryGroup}
              onChange={(e) => {
                setCategoryGroup(e.target.value);
                setErrorMsg(null);
              }}
            >
              <option value="">Todos os grupos</option>
              {grupos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 0.75rem",
              fontSize: "0.85rem",
              color: "var(--color-trading-down, #ef4444)",
              marginBottom: "var(--space-sm)",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Info for HTML format */}
        {format === "summary-html" && (
          <div
            style={{
              backgroundColor: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 0.75rem",
              fontSize: "0.8rem",
              color: "var(--color-text-body)",
              marginBottom: "var(--space-sm)",
            }}
          >
            Abre em nova aba. Use <strong>Ctrl+P → Salvar como PDF</strong> no navegador.
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onClose}
            disabled={loading}
            style={{ minWidth: 80 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleConfirm}
            disabled={loading}
            style={{ minWidth: 100 }}
          >
            {loading ? (
              <span className="loading loading-spinner" style={{ width: 14, height: 14 }} />
            ) : (
              "Exportar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
