const BRL_FORMAT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number): string {
  return BRL_FORMAT.format(value);
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março",
  "04": "Abril",   "05": "Maio",      "06": "Junho",
  "07": "Julho",   "08": "Agosto",    "09": "Setembro",
  "10": "Outubro", "11": "Novembro",  "12": "Dezembro",
};

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const name = MONTH_NAMES[month ?? ""] ?? month;
  return `${name} ${year}`;
}
