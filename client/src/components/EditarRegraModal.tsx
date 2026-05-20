import { useState, useEffect } from "react";
import { updateRegra } from "../api/client.ts";
import type { CategorizationRule, CategoryLabel } from "../api/types.ts";

interface Props {
  open: boolean;
  regra: CategorizationRule | null;
  categorias: CategoryLabel[];
  onClose: () => void;
  onUpdated: (regra: CategorizationRule) => void;
}

export function EditarRegraModal({ open, regra, categorias, onClose, onUpdated }: Props) {
  const [value, setValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (regra) {
      // pattern é %VALUE%, extrair o VALUE interno
      const inner = regra.pattern.replace(/^%/, "").replace(/%$/, "");
      setValue(inner);
      setCategoryId(regra.category_id_override);
      setNote(regra.note ?? "");
      setIsActive(regra.is_active);
    }
  }, [regra]);

  if (!open || !regra) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || !categoryId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateRegra(regra!.id, {
        value: value.trim(),
        category_id: categoryId,
        note: note.trim() || undefined,
        is_active: isActive,
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar regra");
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar Regra"
        style={{ width: "100%", maxWidth: 440, backgroundColor: "var(--color-surface-card)", border: "1px solid var(--color-border-hairline)", borderRadius: "var(--radius-xl)", padding: "var(--space-md)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)", margin: 0 }}>Editar Regra</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-body)", fontSize: 18 }}>✕</button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ marginBottom: "var(--space-sm)" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-body)", display: "block", marginBottom: 4 }}>Padrão (texto contém)</label>
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              style={{ backgroundColor: "var(--color-surface-elevated)", color: "var(--color-text-primary)" }}
            />
          </div>

          <div style={{ marginBottom: "var(--space-sm)" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-body)", display: "block", marginBottom: 4 }}>Categoria</label>
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

          <div style={{ marginBottom: "var(--space-sm)" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-body)", display: "block", marginBottom: 4 }}>Observação (opcional)</label>
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ backgroundColor: "var(--color-surface-elevated)", color: "var(--color-text-primary)" }}
            />
          </div>

          <div style={{ marginBottom: "var(--space-md)", display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              id="is-active-edit"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="is-active-edit" style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-body)", cursor: "pointer" }}>Ativa</label>
          </div>

          {error && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-trading-down)", marginBottom: "var(--space-sm)" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">Cancelar</button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={saving || !value.trim() || !categoryId}>
              {saving ? <span className="loading loading-spinner" style={{ width: 14, height: 14 }} /> : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
