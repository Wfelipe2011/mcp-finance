import { PieChart } from "@mui/x-charts/PieChart";
import type { PatrimonioItem } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function PatrimonioDonut({ contas }: { contas: PatrimonioItem[] }) {
  const grouped = new Map<string, number>();
  for (const c of contas) {
    if (c.tipo === "CREDIT") continue;
    const saldo = c.saldo_atual ?? 0;
    if (saldo <= 0) continue;
    grouped.set(c.tipo, (grouped.get(c.tipo) ?? 0) + saldo);
  }

  const data = Array.from(grouped.entries()).map(([tipo, value], i) => ({
    id: i,
    label: tipo === "BANK" ? "Banco" : tipo === "INVESTMENT" ? "Investimento" : tipo,
    value,
  }));

  if (data.length === 0) return null;

  return (
    <PieChart
      series={[{
        data,
        innerRadius: 45,
        valueFormatter: (item) => formatBRL(item.value),
      }]}
      height={160}
      margin={{ right: 120 }}
    />
  );
}
