const DETAIL_LINKS: { id: string; label: string; icon: string; description: string }[] = [
  { id: "gastos", label: "Gastos", icon: "🧾", description: "Transações e categorias do mês" },
  { id: "proximo-mes", label: "Próx. Mês", icon: "📅", description: "Previsão e compromissos futuros" },
  { id: "investimentos", label: "Investimentos", icon: "📈", description: "Portfólio e evolução patrimonial" },
  { id: "metas", label: "Metas", icon: "🎯", description: "Acompanhamento de objetivos" },
  { id: "simulacao", label: "Simulação", icon: "🔮", description: "Simulações financeiras" },
  { id: "credito", label: "Crédito", icon: "💳", description: "Cartões e parcelas" },
  { id: "ia", label: "Insights", icon: "✨", description: "Análise e recomendações por IA" },
];

export function Plano({ onNavigateTo }: { onNavigateTo: (id: string) => void }) {
  return (
    <div style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-primary)", margin: 0 }}>
          Plano
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-body)", margin: "var(--space-xs) 0 0" }}>
          Ferramentas e detalhes do seu planejamento financeiro.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "var(--space-sm)",
        }}
      >
        {DETAIL_LINKS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigateTo(item.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "var(--space-xs)",
              padding: "var(--space-md)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-hairline)",
              backgroundColor: "var(--color-surface-card)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <span aria-hidden style={{ fontSize: 24 }}>{item.icon}</span>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.label}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-body)" }}>{item.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
