import { DonutChart, Legend } from "@tremor/react";
import type { PatrimonioItem } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function PatrimonioDonut({ contas }: { contas: PatrimonioItem[] }) {
  const grouped = new Map<string, number>();
  for (const c of contas) {
    if (c.tipo === "CREDIT") continue; // skip credit card balances
    const saldo = c.saldo_atual ?? 0;
    if (saldo <= 0) continue;
    grouped.set(c.tipo, (grouped.get(c.tipo) ?? 0) + saldo);
  }

  const data = Array.from(grouped.entries()).map(([tipo, value]) => ({
    name: tipo === "BANK" ? "Banco" : tipo === "INVESTMENT" ? "Investimento" : tipo,
    value,
  }));

  if (data.length === 0) return null;

  return (
    <div>
      <DonutChart
        data={data}
        category="value"
        index="name"
        valueFormatter={formatBRL}
        className="mt-2 h-36"
      />
      <Legend categories={data.map((d) => d.name)} className="mt-2 text-xs" />
    </div>
  );
}
