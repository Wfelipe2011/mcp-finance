import { Text } from "@tremor/react";
import type { NotableExpense } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function NotableExpenses({ expenses }: { expenses: NotableExpense[] | null | undefined }) {
  if (!expenses || expenses.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {expenses.map((e, i) => (
        <li key={i} className="border-l-2 border-amber-400 pl-3">
          <div className="flex justify-between items-baseline">
            <Text className="text-sm font-medium truncate max-w-[70%]">{e.description}</Text>
            <Text className="text-sm font-semibold">{formatBRL(e.amount)}</Text>
          </div>
          <Text className="text-xs text-gray-500 mt-0.5">{e.reason}</Text>
        </li>
      ))}
    </ul>
  );
}
