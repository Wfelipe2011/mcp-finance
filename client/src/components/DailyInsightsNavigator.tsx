import { useState, useEffect, useCallback } from "react";
import { Box, Paper, Typography, IconButton, Chip, CircularProgress } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { fetchMessagesRange } from "../api/client.ts";
import type { MessagesRange } from "../api/types.ts";

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
  const [msg, setMsg] = useState<{ message_pt: string; context_json?: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/forecast/daily?date=${dateStr}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken") ?? ""}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setMsg(data))
      .catch(() => setMsg(null))
      .finally(() => setLoading(false));
  }, [dateStr]);

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
      {msg?.message_pt ? (
        <Typography variant="body1">{msg.message_pt}</Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Sem mensagem disponível para este dia.
        </Typography>
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
