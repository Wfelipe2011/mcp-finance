import { useState } from "react";
import { Button, Chip, LinearProgress, Typography } from "@mui/material";
import type { Compromisso } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const PREVIEW_COUNT = 5;

export function CompromissosLista({ compromissos, total }: { compromissos: Compromisso[]; total: number }) {
  const [showAll, setShowAll] = useState(false);

  if (compromissos.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" fontStyle="italic" sx={{ mt: 1 }}>
        Sem parcelas em aberto.
      </Typography>
    );
  }

  const displayed = showAll ? compromissos : compromissos.slice(0, PREVIEW_COUNT);

  return (
    <div className="mt-2 space-y-3">
      <Typography variant="body2" color="text.secondary">
        Total comprometido:{" "}
        <strong style={{ color: "inherit" }}>{formatBRL(total)}</strong> restante
      </Typography>
      {displayed.map((c, i) => {
        const progress = Math.round((c.installment_atual / c.total_installments) * 100);
        return (
          <div key={i} className="space-y-1">
            <div className="flex justify-between items-start">
              <Typography variant="body2" noWrap sx={{ maxWidth: "65%" }}>{c.description}</Typography>
              <Chip label={`${c.installment_atual}/${c.total_installments}`} size="small" color="default" />
            </div>
            <LinearProgress variant="determinate" value={progress} color="primary" sx={{ borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {formatBRL(c.compromisso_restante)} restante · {c.dono} · {c.cartao}
            </Typography>
          </div>
        );
      })}
      {compromissos.length > PREVIEW_COUNT && (
        <Button
          size="small"
          variant="text"
          onClick={() => setShowAll((v) => !v)}
          sx={{ p: 0, minWidth: 0 }}
        >
          {showAll ? "ver menos ↑" : `ver todos (${compromissos.length}) ↓`}
        </Button>
      )}
    </div>
  );
}
