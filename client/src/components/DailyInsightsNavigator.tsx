import { useState, useEffect, useCallback } from "react";
import { Box, Paper, Typography, IconButton, Chip, CircularProgress, Button } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
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
      .then(r => r.ok ? r.json() : null)
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
    } catch (err: any) {
      if (err?.status === 409) {
        setRegenError("Sem previsões disponíveis para hoje");
      } else {
        setRegenError("Erro ao regenerar. Tente novamente.");
      }
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) return <CircularProgress size={20} />;

  const past = isDayPast(dateStr);
  const future = isDayFuture(dateStr);

  return (
    <Box>
      {future && (
        <Chip label="Previsão" size="small" sx={{ mb: 1, background: "color-mix(in srgb, #0288d1 18%, transparent)", color: "#0288d1" }} />
      )}
      {past && (
        <Chip label="Histórico" size="small" sx={{ mb: 1 }} />
      )}
      {!past && !future && (
        <Chip label="Hoje" size="small" sx={{ mb: 1, background: "color-mix(in srgb, #2e7d32 18%, transparent)", color: "#2e7d32" }} />
      )}

      {msg ? (
        <DailyInsightCard insight={msg} />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Sem mensagem disponível para este dia.
        </Typography>
      )}

      {isToday && (
        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            disabled={regenerating}
            onClick={() => void handleRegenerate()}
          >
            {regenerating ? <><CircularProgress size={16} /> Regenerando...</> : "Regerar"}
          </Button>
          {regenError && (
            <Typography variant="caption" sx={{ color: "var(--color-error, #d32f2f)" }}>
              {regenError}
            </Typography>
          )}
        </Box>
      )}
    </Box>
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
      const todayIdx = r.dates.findIndex(d => d >= todayStr);
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
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!range || range.dates.length === 0) {
    return (
      <Paper elevation={0} sx={{
        p: "var(--space-md)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        bgcolor: "var(--color-surface-card)",
        textAlign: "center",
      }}>
        <Typography variant="body2" color="text.secondary">
          Nenhuma mensagem IA disponível ainda. Ative um modelo para gerar insights.
        </Typography>
      </Paper>
    );
  }

  const currentDate = range.dates[currentIndex]!;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === range.dates.length - 1;

  return (
    <Paper elevation={0} sx={{
      p: "var(--space-md)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--color-border-hairline)",
      bgcolor: "var(--color-surface-card)",
    }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <IconButton
          onClick={() => setCurrentIndex(i => i - 1)}
          disabled={isFirst}
          size="small"
        >
          <ChevronLeftRoundedIcon />
        </IconButton>

        <Typography variant="subtitle1" fontWeight={600}>
          {formatDateLabel(currentDate)}
        </Typography>

        <IconButton
          onClick={() => setCurrentIndex(i => i + 1)}
          disabled={isLast}
          size="small"
        >
          <ChevronRightRoundedIcon />
        </IconButton>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mb: 2 }}>
        {currentIndex + 1} / {range.dates.length}
      </Typography>

      <MessageContent dateStr={currentDate} />
    </Paper>
  );
}

