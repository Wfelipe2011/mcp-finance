export type MainScreenId = "hoje" | "plano";

export type DetailScreenId =
  | "gastos"
  | "proximo-mes"
  | "investimentos"
  | "ia"
  | "metas"
  | "credito"
  | "simulacao"
  | "admin";

export type DetailContext = Record<string, unknown>;

export interface ActiveDetail {
  id: DetailScreenId;
  origin: MainScreenId;
  context?: DetailContext;
}

export const MAIN_SCREEN_LABELS: Record<MainScreenId, string> = {
  hoje: "Hoje",
  plano: "Plano",
};

export const DETAIL_METADATA: Record<
  DetailScreenId,
  { label: string; icon: string; description: string }
> = {
  gastos: {
    label: "Gastos",
    icon: "🧾",
    description: "Transações e categorias do mês",
  },
  "proximo-mes": {
    label: "Próx. Mês",
    icon: "📅",
    description: "Previsão e compromissos futuros",
  },
  investimentos: {
    label: "Investimentos",
    icon: "📈",
    description: "Portfólio e evolução patrimonial",
  },
  ia: {
    label: "Insights",
    icon: "✨",
    description: "Análise e recomendações por IA",
  },
  metas: {
    label: "Metas",
    icon: "🎯",
    description: "Acompanhamento de objetivos",
  },
  credito: {
    label: "Crédito",
    icon: "💳",
    description: "Cartões e parcelas",
  },
  simulacao: {
    label: "Simulação",
    icon: "🔮",
    description: "Simulações financeiras",
  },
  admin: {
    label: "Admin",
    icon: "🛡️",
    description: "Administração do sistema",
  },
};
