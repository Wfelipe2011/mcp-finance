import { Badge } from "@tremor/react";

const FLAG_LABELS: Record<string, { label: string; color: "red" | "amber" | "blue" | "gray" }> = {
  cashflow_negativo:       { label: "Cashflow negativo",       color: "red"   },
  dependencia_de_divida:   { label: "Dependência de dívida",   color: "red"   },
  emprestimo_detectado:    { label: "Empréstimo detectado",    color: "amber" },
  gastos_atipicos:         { label: "Gastos atípicos",         color: "amber" },
  gastos_elevados:         { label: "Gastos elevados",         color: "amber" },
  receita_variavel:        { label: "Receita variável",        color: "blue"  },
  investimento_detectado:  { label: "Investimento detectado",  color: "blue"  },
  sem_anomalias:           { label: "Sem anomalias",           color: "gray"  },
};

export function FlagPills({ flags }: { flags: string[] | null | undefined }) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {flags.map((flag) => {
        const info = FLAG_LABELS[flag] ?? { label: flag, color: "gray" as const };
        return (
          <Badge key={flag} color={info.color}>
            {info.label}
          </Badge>
        );
      })}
    </div>
  );
}
