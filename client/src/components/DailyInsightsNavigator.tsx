import { useState, useEffect, useCallback } from "react";
import { fetchMessagesRange, regenerateDailyInsight } from "../api/client.ts";
import { DailyInsightCard } from "./DailyInsightCard.tsx";
import type { MessagesRange, DailyInsight } from "../api/types.ts";

const MONTH_NAMES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (dateStr === todayStr) return "Hoje";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateStr === yesterday.toISOString().slice(0, 10)) return "Ontem";
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function isDayPast(dateStr: string): boolean {
  return dateStr < new Date().toISOString().slice(0, 10);
}

function isDayFuture(dateStr: string): boolean {
  return dateStr > new Date().toISOString().slice(0, 10);
}

function Badge({ label, color }: { label: string; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        marginBottom: "var(--space-xs)",
        borderRadius: "var(--radius-pill)",
        padding: "1px 8px",
        fontSize: "0.75rem",
        backgroundColor: color ? `color-mix(in srgb, ${color} 18%, transparent)` : "color-mix(in srgb, var(--color-surface-elevated) 70%, transparent)",
        color: color ?? "var(--color-text-body)",
        border: `1px solid ${color ? `color-mix(in srgb, ${color} 35%, transparent)` : "var(--color-border-hairline)"}`,
      }}
    >
      {label}
    </span>
  );
}

function MessageContent({ dateStr }: { dateStr: string }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = dateStr === todayStr;

  const [msg, setMsg] = useState<DailyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setRegenError(null);
    fetch(`/api/forecast/daily?date=${dateStr}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken") ?? ""}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DailyInsight | null) => setMsg(data))
      .catch(() => setMsg(null))
      .finally(() => setLoading(false));
  }, [dateStr]);

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenError(null);
    try {
      const data = await regenerateDailyInsight();
      setMsg(data);
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e?.status === 409) {
        setRegenError("Sem previsões disponíveis para hoje");
      } else {
        setRegenError("Erro ao regenerar. Tente novamente.");
      }
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-lg)" }}>
        <span className="loading loading-spinner" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  const past = isDayPast(dateStr);
  const future = isDayFuture(dateStr);

  return (
    <div>
      {future && <Badge label="Previsão" color="#0288d1" />}
      {past && <Badge label="Histórico" />}
      {!past && !future && <Badge label="Hoje" color="#2e7d32" />}

      {msg ? (
        <DailyInsightCard insight={msg} />
      ) : (
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
          Sem mensagem disponível para este dia.
        </p>
      )}

      {isToday && (
        <div style={{ marginTop: "var(--space-xs)", display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          <button
            type="button"
            disabled={regenerating}
            onClick={() => void handleRegenerate()}
            style={{
              padding: "4px 12px",
              fontSize: "0.875rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-strong)",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: regenerating ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {regenerating ? (
              <>
                <span className="loading loading-spinner" style={{ width: 14, height: 14 }} />
                Regenerando...
              </>
            ) : "Regerar"}
          </button>
          {regenError && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-trading-down)", margin: 0 }}>
              {regenError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function DailyInsightsNavigator() {
  const [range, setRange] = useState<MessagesRange | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadRange = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchMessagesRange();
      setRange(r);
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayIdx = r.dates.findIndex((d) => d >= todayStr);
      setCurrentIndex(todayIdx >= 0 ? todayIdx : Math.max(0, r.dates.length - 1));
    } catch {
      setRange({ dates: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRange(); }, [loadRange]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-xl)" }}>
        <span className="loading loading-spinner" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  if (!range || range.dates.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-md)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-hairline)",
          backgroundColor: "var(--color-surface-card)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", margin: 0 }}>
          Nenhuma mensagem IA disponível ainda. Ative um modelo para gerar insights.
        </p>
      </div>
    );
  }

  const currentDate = range.dates[currentIndex]!;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === range.dates.length - 1;

  const btnStyle = (disabled: boolean) => ({
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "1px solid var(--color-border-hairline)",
    background: "var(--color-surface-card)",
    color: disabled ? "var(--color-muted)" : "var(--color-text-primary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontSize: 18,
  });

  return (
    <div
      style={{
        padding: "var(--space-md)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        backgroundColor: "var(--color-surface-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-sm)" }}>
        <button
          type="button"
          style={btnStyle(isFirst)}
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={isFirst}
          aria-label="Dia anterior"
        >
          ‹
        </button>

        <p style={{ fontWeight: 600, fontSize: "1rem", margin: 0 }}>
          {formatDateLabel(currentDate)}
        </p>

        <button
          type="button"
          style={btnStyle(isLast)}
          onClick={() => setCurrentIndex((i) => i + 1)}
          disabled={isLast}
          aria-label="Próximo dia"
        >
          ›
        </button>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", textAlign: "center", marginBottom: "var(--space-sm)" }}>
        {currentIndex + 1} / {range.dates.length}
      </p>

      <MessageContent dateStr={currentDate} />
    </div>
  );
}
