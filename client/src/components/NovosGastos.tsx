import { Badge, Text } from "@tremor/react";
import type { GastoNovo } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function NovosGastos({ novos }: { novos: GastoNovo[] }) {
  if (novos.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {novos.map((g, i) => (
        <li key={i} className="flex items-center justify-between">
          <div className="min-w-0">
            <Text className="text-sm truncate">{g.category_pt}</Text>
            <Text className="text-xs text-gray-400">{g.group_pt} · {g.display_name}</Text>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Text className="text-sm font-medium">{formatBRL(g.total_gastos)}</Text>
            <Badge color="blue" size="xs">NOVO</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
