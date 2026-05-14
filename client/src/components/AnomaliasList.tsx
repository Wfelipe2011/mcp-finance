import { LinearProgress, Typography } from "@mui/material";
import type { Transacao } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function AnomaliasList({ transacoes }: { transacoes: Transacao[] }) {
  if (transacoes.length === 0) {
    return (
      <Typography variant="body2" color="success.main" fontStyle="italic" sx={{ mt: 1 }}>
        ✓ Nenhuma anomalia detectada este mês.
      </Typography>
    );
  }

  return (
    <ul className="mt-2 space-y-3">
      {transacoes.map((t) => (
        <li key={t.transaction_id} className="space-y-1">
          <div className="flex justify-between items-baseline">
            <Typography variant="body2" noWrap sx={{ maxWidth: "65%" }}>
              {t.merchant_name ?? t.description}
            </Typography>
            <Typography variant="body2" fontWeight={500}>{formatBRL(Math.abs(t.amount_signed))}</Typography>
          </div>
          <LinearProgress
            variant="determinate"
            value={Math.round((t.anomaly_score ?? 0) * 100)}
            color="error"
            sx={{ borderRadius: 1, height: 6 }}
          />
          <Typography variant="caption" color="text.secondary">
            score: {t.anomaly_score?.toFixed(2)} · {t.category_pt ?? "sem categoria"} · {t.date_day.slice(0, 10)}
          </Typography>
        </li>
      ))}
    </ul>
  );
}
