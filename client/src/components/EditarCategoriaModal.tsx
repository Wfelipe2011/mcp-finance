import { useState, useEffect } from "react";
import {
  fetchCategorias,
  patchCategoriaTransacao,
  createRegra,
  aplicarHistorico,
  countTransacoesSimilares,
} from "../api/client.ts";
import type { CategoryLabel, CategorizationRule } from "../api/types.ts";

interface Props {
  open: boolean;
  transactionId: string;
  description: string;
  currentCategoryId: string | null;
  currentCategoryPt: string | null;
  onClose: () => void;
  onSaved: (newCategoryPt: string, newCategoryId: string) => void;
  onRegraCreated?: (regra: CategorizationRule) => void;
}

export function EditarCategoriaModal({ open, transactionId, description, currentCategoryId, currentCategoryPt, onClose, onSaved, onRegraCreated }: Props) {
  const [categorias, setCategorias] = useState<CategoryLabel[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [criarRegra, setCriarRegra] = useState(false);
  const [aplicarAnteriores, setAplicarAnteriores] = useState(false);
  const [similares, setSimilares] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCriarRegra(false);
    setAplicarAnteriores(false);
    setSimilares(null);
    setError(null);
    setToast(null);
    setCategoryId(currentCategoryId ?? "");
    fetchCategorias().then(setCategorias).catch(() => {});
  }, [open, transactionId, currentCategoryId]);

  // Count similares quando criarRegra for ativado
  useEffect(() => {
    if (!criarRegra || !description) { setSimilares(null); return; }
    // Usar as primeiras palavras significativas da descrição como prefixo de busca
    const prefix = description.split(/\s+/).slice(0, 3).join(" ");
    countTransacoesSimilares(prefix)
      .then((r) => setSimilares(r.count))
      .catch(() => setSimilares(null));
  }, [criarRegra, description]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return;
    setSaving(true);
    setError(null);

    const selectedCat = categorias.find((c) => c.category_id === categoryId);
    if (!selectedCat) { setSaving(false); return; }

    try {
      // 1) Override pontual da transação
      await patchCategoriaTransacao(transactionId, categoryId);

      let novaRegra: CategorizationRule | null = null;
      let affectedCount = 0;

      if (criarRegra) {
        // 2) Criar regra com base na descrição
        const prefix = description.split(/\s+/).slice(0, 3).join(" ");
        novaRegra = await createRegra({ value: prefix, category_id: categoryId });

        if (aplicarAnteriores && novaRegra) {
          // 3) Aplicar regra às anteriores
          const result = await aplicarHistorico(novaRegra.id);
          affectedCount = result.affected;
        }
      }

      if (novaRegra && onRegraCreated) onRegraCreated(novaRegra);
      onSaved(selectedCat.name_pt, categoryId);

      if (criarRegra && aplicarAnteriores) {
        setToast(`Categoria atualizada. Regra criada e aplicada a ${affectedCount} transações anteriores.`);
      } else if (criarRegra) {
        setToast("Categoria atualizada e regra criada para futuros lançamentos similares.");
      } else {
        setToast("Categoria atualizada.");
      }

      setTimeout(() => {
        setToast(null);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const grouped = categorias.reduce<Record<string, CategoryLabel[]>>((acc, cat) => {
    const g = cat.group_name_pt || "Outros";
    if (!acc[g]) acc[g] = [];
    acc[g]!.push(cat);
    return acc;
  }, {});

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "var(--space-md)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar Categoria"
        style={{ width: "100%", maxWidth: 420, backgroundColor: "var(--color-surface-card)", border: "1px solid var(--color-border-hairline)", borderRadius: "var(--radius-xl)", padding: "var(--space-md)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
          <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)", margin: 0 }}>Editar Categoria</h3>
          <button type="button" onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-body)", fontSize: 18 }}>✕</button>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginBottom: "var(--space-sm)", wordBreak: "break-word" }}>
          {description}
        </p>
        {currentCategoryPt && (
          <p style={{ fontSize: "0.7rem", color: "var(--color-muted-strong)", marginBottom: "var(--space-sm)" }}>
            Categoria atual: <strong>{currentCategoryPt}</strong>
          </p>
        )}

        {toast ? (
          <div style={{ padding: "var(--space-sm)", backgroundColor: "color-mix(in srgb, var(--color-trading-up) 15%, var(--color-surface-card))", borderRadius: "var(--radius-md)", fontSize: "0.8rem", color: "var(--color-trading-up)", textAlign: "center" }}>
            {toast}
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={{ marginBottom: "var(--space-sm)" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-body)", display: "block", marginBottom: 4 }}>Nova categoria</label>
              <select
                className="select select-sm select-bordered w-full"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                style={{ backgroundColor: "var(--color-surface-elevated)", color: "var(--color-text-primary)" }}
              >
                <option value="">Selecionar categoria...</option>
                {Object.entries(grouped).map(([group, cats]) => (
                  <optgroup key={group} label={group}>
                    {cats.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>{cat.name_pt}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "var(--space-xs)", display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                id="criar-regra-modal"
                checked={criarRegra}
                onChange={(e) => { setCriarRegra(e.target.checked); if (!e.target.checked) setAplicarAnteriores(false); }}
              />
              <label htmlFor="criar-regra-modal" style={{ fontSize: "0.75rem", color: "var(--color-text-body)", cursor: "pointer" }}>
                Criar regra para futuros lançamentos similares
              </label>
            </div>

            {criarRegra && (
              <div style={{ marginLeft: 24, marginBottom: "var(--space-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    id="aplicar-anteriores-modal"
                    checked={aplicarAnteriores}
                    onChange={(e) => setAplicarAnteriores(e.target.checked)}
                  />
                  <label htmlFor="aplicar-anteriores-modal" style={{ fontSize: "0.75rem", color: "var(--color-text-body)", cursor: "pointer" }}>
                    Aplicar também às transações anteriores
                  </label>
                </div>
                {similares !== null && (
                  <p style={{ fontSize: "0.7rem", color: "var(--color-muted)", margin: 0 }}>
                    {similares} transações similares encontradas no histórico
                  </p>
                )}
              </div>
            )}

            {error && (
              <p style={{ fontSize: "0.75rem", color: "var(--color-trading-down)", marginBottom: "var(--space-sm)" }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "var(--space-sm)" }}>
              <button type="button" onClick={onClose} className="btn btn-sm btn-ghost" disabled={saving}>Cancelar</button>
              <button type="submit" className="btn btn-sm btn-primary" disabled={saving || !categoryId}>
                {saving ? <span className="loading loading-spinner" style={{ width: 14, height: 14 }} /> : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
