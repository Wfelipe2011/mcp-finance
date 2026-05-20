import type { SimulationMonth } from "../api/types.ts";

interface Props {
  months: SimulationMonth[];
  llmMessage?: string | null;
}

const MONTH_NAMES: Record<number, string> = {
  1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr",
  5: "Mai", 6: "Jun", 7: "Jul", 8: "Ago",
  9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
};

function getStatusBadge(month: SimulationMonth) {
  if (month.balance < 0) {
    return <span className="badge badge-error badge-sm">Inviável</span>;
  }
  if (month.total_income > 0 && month.balance / month.total_income < 0.1) {
    return <span className="badge badge-warning badge-sm">Apertado</span>;
  }
  return <span className="badge badge-success badge-sm">Viável</span>;
}

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SimulacaoResultado({ months, llmMessage }: Props) {
  if (months.length === 0) return null;

  const anyNegative = months.some(m => m.balance < 0);
  const anyTight = !anyNegative && months.some(
    m => m.total_income > 0 && m.balance / m.total_income < 0.1,
  );
  const overallLabel = anyNegative ? "inviavel" : anyTight ? "apertado" : "viavel";

  return (
    <div className="space-y-4">
      {/* Badge geral */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">Resultado geral:</span>
        {overallLabel === "inviavel" && (
          <span className="badge badge-error">Inviável — saldo negativo em algum mês</span>
        )}
        {overallLabel === "apertado" && (
          <span className="badge badge-warning">Apertado — margem abaixo de 10% em algum mês</span>
        )}
        {overallLabel === "viavel" && (
          <span className="badge badge-success">Viável — saldo positivo em todos os meses</span>
        )}
      </div>

      {/* Tabela de projeção */}
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Mês</th>
              <th className="text-right">Receita</th>
              <th className="text-right">Despesa</th>
              <th className="text-right">Saldo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr
                key={m.month_offset}
                className={
                  m.balance < 0
                    ? "bg-error/10"
                    : m.total_income > 0 && m.balance / m.total_income < 0.1
                      ? "bg-warning/10"
                      : ""
                }
              >
                <td className="font-medium">
                  {MONTH_NAMES[m.month]}/{m.year}
                </td>
                <td className="text-right text-success">R$ {fmt(m.total_income)}</td>
                <td className="text-right text-error">R$ {fmt(m.total_expenses)}</td>
                <td className={`text-right font-semibold ${m.balance >= 0 ? "text-success" : "text-error"}`}>
                  {m.balance >= 0 ? "+" : ""}R$ {fmt(m.balance)}
                </td>
                <td>{getStatusBadge(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chat bubble com mensagem LLM */}
      {llmMessage && (
        <div className="chat chat-start mt-4">
          <div className="chat-image avatar">
            <div className="w-8 rounded-full bg-primary flex items-center justify-center text-primary-content text-sm">
              ✨
            </div>
          </div>
          <div className="chat-header text-xs opacity-60 mb-1">Consultor IA</div>
          <div className="chat-bubble chat-bubble-primary text-sm max-w-lg">
            {llmMessage}
          </div>
        </div>
      )}
    </div>
  );
}
