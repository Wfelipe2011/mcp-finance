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
      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
    >
      {meses.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
