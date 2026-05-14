import { useState } from "react";
import { Card, Text } from "@tremor/react";

const PREVIEW_LENGTH = 200;

export function DigestNarrative({ narrative }: { narrative: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);

  if (!narrative) {
    return (
      <Card className="mt-3 bg-gray-50">
        <Text className="text-gray-400 italic">Análise de IA não disponível para este mês.</Text>
      </Card>
    );
  }

  const isLong = narrative.length > PREVIEW_LENGTH;
  const displayed = expanded || !isLong ? narrative : narrative.slice(0, PREVIEW_LENGTH) + "…";

  return (
    <Card className="mt-3 bg-blue-50">
      <Text className="text-blue-900 text-sm leading-relaxed whitespace-pre-wrap">{displayed}</Text>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-blue-600 underline"
        >
          {expanded ? "ver menos ↑" : "ver mais ↓"}
        </button>
      )}
    </Card>
  );
}
