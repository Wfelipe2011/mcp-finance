import { Typography } from "@mui/material";
import type { NotableExpense } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function NotableExpenses({ expenses }: { expenses: NotableExpense[] | null | undefined }) {
  if (!expenses || expenses.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {expenses.map((e, i) => (
        <li key={i} className="border-l-2 border-amber-400 pl-3">
          <div className="flex justify-between items-baseline">
            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: "70%" }}>{e.description}</Typography>
            <Typography variant="body2" fontWeight={600}>{formatBRL(e.amount)}</Typography>
          </div>
          <Typography variant="caption" color="text.secondary">{e.reason}</Typography>
        </li>
      ))}
    </ul>
  );
}
