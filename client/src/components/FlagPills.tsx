import { Chip } from "@mui/material";

type ChipColor = "error" | "warning" | "primary" | "default" | "success" | "info" | "secondary";

const FLAG_LABELS: Record<string, { label: string; color: ChipColor }> = {
  cashflow_negativo:       { label: "Cashflow negativo",       color: "error"   },
  dependencia_de_divida:   { label: "Dependência de dívida",   color: "error"   },
  emprestimo_detectado:    { label: "Empréstimo detectado",    color: "warning" },
  gastos_atipicos:         { label: "Gastos atípicos",         color: "warning" },
  gastos_elevados:         { label: "Gastos elevados",         color: "warning" },
  receita_variavel:        { label: "Receita variável",        color: "primary" },
  investimento_detectado:  { label: "Investimento detectado",  color: "primary" },
  sem_anomalias:           { label: "Sem anomalias",           color: "default" },
};

export function FlagPills({ flags }: { flags: string[] | null | undefined }) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {flags.map((flag) => {
        const info = FLAG_LABELS[flag] ?? { label: flag, color: "default" as ChipColor };
        return (
          <Chip key={flag} label={info.label} color={info.color} size="small" />
        );
      })}
    </div>
  );
}
