import { useEffect, useState } from "react";
import { fetchMeses } from "../api/client.ts";

interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [meses, setMeses] = useState<string[]>([]);

  useEffect(() => {
    fetchMeses()
      .then((data) => {
        setMeses(data);
        if (!value && data.length > 0) onChange(data[0]!);
      })
      .catch(console.error);
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="select select-sm select-bordered"
      style={{
        backgroundColor: "var(--color-surface-strong)",
        borderRadius: "var(--radius-lg)",
        color: "var(--color-text-primary)",
        minWidth: 140,
      }}
    >
      {meses.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
