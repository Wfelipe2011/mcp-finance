export function LoadingCard({ title = "Carregando..." }: { title?: string }) {
  return (
    <div
      style={{
        marginTop: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-md)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        backgroundColor: "var(--color-surface-card)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
      }}
    >
      <span className="loading loading-spinner" style={{ width: 20, height: 20, color: "var(--color-primary)" }} />
      <p style={{ color: "var(--color-text-body)", fontWeight: 500, fontSize: "0.875rem", margin: 0 }}>
        {title}
      </p>
    </div>
  );
}
