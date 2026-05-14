import { useState } from "react";
import { ProgressBar, Text, Badge } from "@tremor/react";
import type { Compromisso } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const PREVIEW_COUNT = 5;

export function CompromissosLista({ compromissos, total }: { compromissos: Compromisso[]; total: number }) {
  const [showAll, setShowAll] = useState(false);

  if (compromissos.length === 0) {
    return <Text className="text-gray-400 italic mt-2">Sem parcelas em aberto.</Text>;
  }

  const displayed = showAll ? compromissos : compromissos.slice(0, PREVIEW_COUNT);

  return (
    <div className="mt-2 space-y-3">
      <Text className="text-sm text-gray-600">
        Total comprometido: <span className="font-semibold text-gray-900">{formatBRL(total)}</span> restante
      </Text>
      {displayed.map((c, i) => {
        const progress = Math.round((c.installment_atual / c.total_installments) * 100);
        return (
          <div key={i} className="space-y-1">
            <div className="flex justify-between items-start">
              <Text className="text-sm truncate max-w-[65%]">{c.description}</Text>
              <Badge color="gray" size="xs">{c.installment_atual}/{c.total_installments}</Badge>
            </div>
            <ProgressBar value={progress} color="blue" className="mt-1" />
            <Text className="text-xs text-gray-500">
              {formatBRL(c.compromisso_restante)} restante · {c.dono} · {c.cartao}
            </Text>
          </div>
        );
      })}
      {compromissos.length > PREVIEW_COUNT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-blue-600 underline"
        >
          {showAll ? "ver menos ↑" : `ver todos (${compromissos.length}) ↓`}
        </button>
      )}
    </div>
  );
}
