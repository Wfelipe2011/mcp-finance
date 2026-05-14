import { BarList } from "@tremor/react";
import type { GastoCategoria } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const MAX_CATEGORIAS = 10;

export function CategoriaBarList({ categorias }: { categorias: GastoCategoria[] }) {
  if (categorias.length === 0) return null;

  const data = categorias
    .slice(0, MAX_CATEGORIAS)
    .map((c) => ({ name: c.category_pt, value: c.total_gastos }));

  return (
    <BarList
      data={data}
      valueFormatter={formatBRL}
      className="mt-2"
    />
  );
}
