import { useEffect, useState } from "react";
import { FormControl, MenuItem, Select } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
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
    <FormControl size="small" fullWidth variant="outlined">
      <Select
        value={value}
        onChange={(e: SelectChangeEvent) => onChange(e.target.value)}
        displayEmpty
      >
        {meses.map((m) => (
          <MenuItem key={m} value={m}>
            {m}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
