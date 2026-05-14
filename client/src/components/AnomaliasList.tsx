import { ProgressBar, Text } from "@tremor/react";
import type { Transacao } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function AnomaliasList({ transacoes }: { transacoes: Transacao[] }) {
  if (transacoes.length === 0) {
    return <Text className="text-emerald-600 text-sm italic mt-2">✓ Nenhuma anomalia detectada este mês.</Text>;
  }

  return (
    <ul className="mt-2 space-y-3">
      {transacoes.map((t) => (
        <li key={t.transaction_id} className="space-y-1">
          <div className="flex justify-between items-baseline">
            <Text className="text-sm truncate max-w-[65%]">{t.merchant_name ?? t.description}</Text>
            <Text className="text-sm font-medium">{formatBRL(Math.abs(t.amount_signed))}</Text>
          </div>
          <ProgressBar
            value={Math.round((t.anomaly_score ?? 0) * 100)}
            color="red"
            className="h-1.5"
          />
          <Text className="text-xs text-gray-400">
            score: {t.anomaly_score?.toFixed(2)} · {t.category_pt ?? "sem categoria"} · {t.date_day.slice(0, 10)}
          </Text>
        </li>
      ))}
    </ul>
  );
}
