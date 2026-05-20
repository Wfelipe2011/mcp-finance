import { useState, useEffect } from "react";
import { fetchUsers, updateUserDisplayName } from "../api/client.ts";
import type { User } from "../api/types.ts";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ConfigDialog({ open, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, "idle" | "loading" | "success" | "error">>({});

  useEffect(() => {
    if (!open) return;
    fetchUsers()
      .then((u) => {
        setUsers(u);
        setDrafts(Object.fromEntries(u.map((user) => [user.id, user.display_name])));
        setSaving(Object.fromEntries(u.map((user) => [user.id, "idle"])));
      })
      .catch(() => {});
  }, [open]);

  async function handleSave(user: User) {
    const draft = drafts[user.id] ?? user.display_name;
    if (!draft.trim() || draft === user.display_name) return;
    setSaving((s) => ({ ...s, [user.id]: "loading" }));
    try {
      const updated = await updateUserDisplayName(user.id, draft);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSaving((s) => ({ ...s, [user.id]: "success" }));
      setTimeout(() => setSaving((s) => ({ ...s, [user.id]: "idle" })), 2000);
    } catch {
      setSaving((s) => ({ ...s, [user.id]: "error" }));
      setTimeout(() => setSaving((s) => ({ ...s, [user.id]: "idle" })), 2000);
    }
  }

  if (!open) return null;

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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "var(--color-surface-card)",
          border: "1px solid var(--color-border-hairline)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-md)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-primary)", margin: 0 }}>
            ⚙️ Configurações
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "1px solid var(--color-border-hairline)",
              background: "var(--color-surface-card)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-body)", marginBottom: "var(--space-sm)" }}>
          Membros
        </p>

        {users.map((user) => (
          <div key={user.id} style={{ marginBottom: "var(--space-sm)" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-body)", margin: 0, marginBottom: 4 }}>
              {user.name}
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                className="input input-sm input-bordered flex-1"
                placeholder="Nome exibido"
                value={drafts[user.id] ?? user.display_name}
                onChange={(e) => setDrafts((d) => ({ ...d, [user.id]: e.target.value }))}
                style={{ backgroundColor: "var(--color-surface-elevated)", color: "var(--color-text-primary)" }}
              />
              <button
                type="button"
                onClick={() => void handleSave(user)}
                disabled={saving[user.id] === "loading"}
                title="Salvar"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "1px solid var(--color-border-hairline)",
                  background: saving[user.id] === "success" ? "color-mix(in srgb, var(--color-trading-up) 20%, var(--color-surface-card))" : "var(--color-surface-card)",
                  color: saving[user.id] === "error" ? "var(--color-trading-down)" : saving[user.id] === "success" ? "var(--color-trading-up)" : "var(--color-text-primary)",
                  cursor: saving[user.id] === "loading" ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                {saving[user.id] === "loading" ? (
                  <span className="loading loading-spinner" style={{ width: 14, height: 14 }} />
                ) : "✓"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
