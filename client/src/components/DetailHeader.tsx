import type { MainScreenId } from "../navigation.ts";

interface Props {
  title: string;
  description?: string;
  origin: MainScreenId;
  onBack: () => void;
}

export function DetailHeader({ title, description, origin, onBack }: Props) {
  const originLabel = origin === "hoje" ? "Hoje" : "Plano";

  return (
    <div
      data-testid="detail-header"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-xs)",
        padding: "var(--space-md) var(--space-md) 0",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label={`Voltar para ${originLabel}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-xs)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--color-primary)",
          fontSize: "0.8125rem",
          fontWeight: 600,
          padding: 0,
          textDecoration: "none",
          width: "fit-content",
        }}
      >
        ← {originLabel}
      </button>

      <div>
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "var(--color-text-primary)",
          }}
        >
          {title}
        </p>
        {description && (
          <p
            style={{
              margin: "var(--space-xs) 0 0",
              fontSize: "0.875rem",
              color: "var(--color-text-body)",
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
