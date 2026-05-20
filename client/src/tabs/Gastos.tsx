import { useState, useEffect, useCallback } from "react";
import { fetchGastos, fetchTendencias, fetchBudgets, fetchTransacoes } from "../api/client.ts";
import type { GastosMensais, Tendencias, BudgetExecution, Transacao, CategorizationRule } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { GruposDonut } from "../components/GruposDonut.tsx";
import { CategoriaBarList } from "../components/CategoriaBarList.tsx";
import { NovosGastos } from "../components/NovosGastos.tsx";
import { TendenciasGrupos } from "../components/TendenciasGrupos.tsx";
import { TendenciasRecorrentes } from "../components/TendenciasRecorrentes.tsx";
import { BudgetCard } from "../components/BudgetCard.tsx";
import { ExportModal } from "../components/ExportModal.tsx";
import { EditarCategoriaModal } from "../components/EditarCategoriaModal.tsx";
import { formatBRL } from "../utils/format.ts";

const cardStyle = {
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-md)",
  border: "1px solid var(--color-border-hairline)",
  backgroundColor: "var(--color-surface-card)",
};
const captionStyle = {
  fontSize: "0.75rem",
  textTransform: "uppercase" as const,
  letterSpacing: 0.9,
  fontWeight: 600,
  color: "var(--color-text-body)",
  margin: 0,
};
const captionMutedStyle = { ...captionStyle, letterSpacing: 0.8, color: "var(--color-muted-strong)" };

export function Gastos({ month }: { month: string }) {
  const [data, setData] = useState<GastosMensais | null>(null);
  const [tendencias, setTendencias] = useState<Tendencias | null>(null);
  const [budgets, setBudgets] = useState<BudgetExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // Transações individuais com edição de categoria
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [transacoesTotal, setTransacoesTotal] = useState(0);
  const [transacoesLoading, setTransacoesLoading] = useState(false);
  const [txPageOffset, setTxPageOffset] = useState(0);
  const [editModal, setEditModal] = useState<{ tx: Transacao } | null>(null);

  const loadBudgets = useCallback(() => {
    fetchBudgets().then(setBudgets).catch(() => setBudgets([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setTransacoes([]);
    setTxPageOffset(0);
    Promise.all([
      fetchGastos(month),
      fetchTendencias().catch(() => null),
      fetchBudgets().catch(() => []),
    ])
      .then(([d, t, b]) => { setData(d); setTendencias(t); setBudgets(b); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar gastos");
        setLoading(false);
      });
  }, [month]);

  useEffect(() => {
    setTransacoesLoading(true);
    fetchTransacoes(month, 50, txPageOffset)
      .then((r) => {
        setTransacoes((prev) => txPageOffset === 0 ? r.items : [...prev, ...r.items]);
        setTransacoesTotal(r.total);
      })
      .catch(() => {})
      .finally(() => setTransacoesLoading(false));
  }, [month, txPageOffset]);

  if (loading) return <LoadingCard title="Carregando Gastos..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data) return <ErrorCard message="Dados não disponíveis." />;

  const totalGasto = data.grupos.reduce((sum, g) => sum + g.total_gastos, 0);
  const grupos = data.grupos.map((g) => g.group_pt);

  // Calcular dateFrom/dateTo do mês selecionado
  const [monthYear, monthNum] = month.split("-");
  const y = parseInt(monthYear ?? "", 10);
  const m = parseInt(monthNum ?? "", 10);
  const lastDay = isNaN(y) || isNaN(m) ? 28 : new Date(y, m, 0).getDate();
  const dateFrom = isNaN(y) || isNaN(m) ? "" : `${y}-${String(m).padStart(2, "0")}-01`;
  const dateTo = isNaN(y) || isNaN(m) ? "" : `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  function handleCategorySaved(txId: string, newCategoryPt: string, newCategoryId: string) {
    setTransacoes((prev) =>
      prev.map((tx) =>
        tx.transaction_id === txId
          ? { ...tx, category_id: newCategoryId, category_pt: newCategoryPt, category_group_pt: tx.category_group_pt }
          : tx
      )
    );
  }

  function handleRegraCreated(_regra: CategorizationRule) {
    // Regra criada — sem ação local necessária; aparecerá em Configurações > Regras
  }

  return (
    <div className="mt-4 space-y-4">
      {editModal && (
        <EditarCategoriaModal
          open
          transactionId={editModal.tx.transaction_id}
          description={editModal.tx.description}
          currentCategoryId={editModal.tx.category_id}
          currentCategoryPt={editModal.tx.category_pt}
          onClose={() => setEditModal(null)}
          onSaved={(newPt, newId) => {
            handleCategorySaved(editModal.tx.transaction_id, newPt, newId);
            setEditModal(null);
          }}
          onRegraCreated={handleRegraCreated}
        />
      )}

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
        grupos={grupos}
      />
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <p style={captionStyle}>Total Gasto</p>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setExportOpen(true)}
            style={{ marginTop: "-0.25rem" }}
          >
            Exportar
          </button>
        </div>
        <p
          data-testid="gastos-total"
          data-tone="negative"
          style={{
            color: "var(--color-trading-down)",
            fontWeight: 700,
            marginTop: "var(--space-xs)",
            fontFamily: "var(--font-family-numeric)",
            fontSize: "2rem",
            lineHeight: 1.1,
            margin: 0,
            marginBlockStart: "var(--space-xs)",
          }}
        >
          {formatBRL(totalGasto)}
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: "var(--space-xs)" }}>
          Consolidado dos grupos para o mês selecionado.
        </p>
      </div>

      <div style={cardStyle}>
        <p style={captionMutedStyle}>Por onde foi</p>
        <div style={{ marginTop: "var(--space-xs)" }}>
          <GruposDonut grupos={data.grupos} />
        </div>
      </div>

      <div style={cardStyle}>
        <p style={captionMutedStyle}>Por categoria</p>
        <div style={{ marginTop: "var(--space-xs)" }}>
          <CategoriaBarList categorias={data.categorias} />
        </div>
      </div>

      {data.novos.length > 0 && (
        <div style={cardStyle}>
          <p style={captionMutedStyle}>Novos este mês</p>
          <div style={{ marginTop: "var(--space-xs)" }}>
            <NovosGastos novos={data.novos} />
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <BudgetCard
          budgets={budgets}
          categorias={data.categorias}
          onRefresh={loadBudgets}
        />
      </div>

      {/* Transações individuais com edição de categoria */}
      <div style={cardStyle}>
        <p style={captionMutedStyle}>Transações do mês</p>
        <div style={{ marginTop: "var(--space-xs)", overflowX: "auto" }}>
          {transacoesLoading && transacoes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-sm)" }}>
              <span className="loading loading-spinner" style={{ width: 18, height: 18 }} />
            </div>
          ) : (
            <>
              <table className="table table-xs w-full">
                <thead>
                  <tr>
                    <th style={{ color: "var(--color-muted-strong)", fontSize: "0.65rem" }}>Data</th>
                    <th style={{ color: "var(--color-muted-strong)", fontSize: "0.65rem" }}>Descrição</th>
                    <th style={{ color: "var(--color-muted-strong)", fontSize: "0.65rem" }}>Categoria</th>
                    <th style={{ color: "var(--color-muted-strong)", fontSize: "0.65rem", textAlign: "right" }}>Valor</th>
                    <th style={{ width: 28 }} />
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((tx) => (
                    <tr key={tx.transaction_id}>
                      <td style={{ fontSize: "0.7rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                        {tx.date_day.slice(5)}
                      </td>
                      <td style={{ fontSize: "0.72rem", color: "var(--color-text-primary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tx.description}>
                        {tx.description}
                      </td>
                      <td style={{ fontSize: "0.7rem", color: "var(--color-text-body)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.category_pt ?? "—"}
                      </td>
                      <td style={{ fontSize: "0.72rem", textAlign: "right", color: tx.amount_signed < 0 ? "var(--color-trading-down)" : "var(--color-trading-up)", fontFamily: "var(--font-family-numeric)", whiteSpace: "nowrap" }}>
                        {formatBRL(Math.abs(tx.amount_signed))}
                      </td>
                      <td>
                        <button
                          type="button"
                          title="Editar categoria"
                          onClick={() => setEditModal({ tx })}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: 13, padding: 2, lineHeight: 1 }}
                        >
                          ✎
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transacoes.length < transacoesTotal && (
                <div style={{ textAlign: "center", marginTop: "var(--space-xs)" }}>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    disabled={transacoesLoading}
                    onClick={() => setTxPageOffset((o) => o + 50)}
                  >
                    {transacoesLoading ? <span className="loading loading-spinner" style={{ width: 12, height: 12 }} /> : `Ver mais (${transacoesTotal - transacoes.length} restantes)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {tendencias && (
        <>
          <div style={cardStyle}>
            <p style={captionMutedStyle}>Média 3 meses</p>
            <div style={{ marginTop: "var(--space-xs)" }}>
              <TendenciasGrupos grupos={tendencias.grupos} />
            </div>
          </div>

          <div style={cardStyle}>
            <p style={captionMutedStyle}>Recorrentes identificados</p>
            <div style={{ marginTop: "var(--space-xs)" }}>
              <TendenciasRecorrentes recorrentes={tendencias.recorrentes} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
