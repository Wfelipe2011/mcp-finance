export function ErrorCard({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-md)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-trading-down)",
        backgroundColor: "var(--color-surface-card)",
      }}
    >
      <p style={{ color: "var(--color-trading-down)", fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>
        Erro: {message}
      </p>
    </div>
  );
}
