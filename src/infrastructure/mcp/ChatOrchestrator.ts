/**
 * Orquestrador de chat via MCP.
 *
 * ## Fluxo de execução
 *
 *   Cliente → POST /api/chat (web :3001)
 *     → ChatOrchestrator.orchestrateChat()
 *       → detectIntent()           — detecção determinística por palavras-chave
 *       → callMcpTool()            — chamada JSON-RPC ao servidor MCP (:3002)
 *       → naturalize*()            — template em pt-BR, máx 3 frases
 *     ← { reply: string }
 *
 *   Resumo: web 3001 → MCP 3002 → naturalização → cliente
 *
 * ## Etapas internas
 *
 *  1. Detecta a intent da mensagem por palavras-chave (determinístico, sem LLM)
 *  2. Monta os argumentos obrigatórios para a tool MCP correspondente
 *  3. Chama o servidor MCP via `callMcpTool`
 *  4. Naturaliza o payload estruturado em resposta curta em pt-BR (máx 3 frases)
 *  5. Aplica fallback seguro em caso de intent desconhecida ou erro inesperado
 *
 * @see docs/chat-flow.md — documentação técnica do fluxo completo
 */

import { callMcpTool, McpTimeoutError, McpToolError, McpParseError } from "./McpClient.ts";

// ---------------------------------------------------------------------------
// 2.1 — Matriz de intents suportadas no MVP
// ---------------------------------------------------------------------------

/**
 * Intents suportadas pelo orquestrador de chat.
 *
 * - `get_monthly_balance`       → saldo, receitas ou despesas do mês corrente
 * - `get_subscription_analysis` → assinaturas, recorrências ou mensalidades
 * - `get_credit_card_status`    → cartões de crédito, faturas ou limites
 * - `unknown`                   → intent não reconhecida — aplica fallback amigável
 */
export type IntentName =
  | "get_monthly_balance"
  | "get_subscription_analysis"
  | "get_credit_card_status"
  | "unknown";

// ---------------------------------------------------------------------------
// 2.2 — Detecção determinística de intent por palavras-chave
// ---------------------------------------------------------------------------

/**
 * Mapa de palavras-chave por intent, em ordem de prioridade decrescente.
 * A avaliação ocorre em sequência: a primeira intent com match vence.
 *
 * Prioridade:
 *  1. get_credit_card_status    (termos muito específicos — menor risco de colisão)
 *  2. get_subscription_analysis (termos de recorrência)
 *  3. get_monthly_balance       (termos genéricos de balanço — avaliado por último)
 */
const INTENT_KEYWORDS: Array<{ intent: Exclude<IntentName, "unknown">; keywords: string[] }> = [
  {
    intent: "get_credit_card_status",
    keywords: [
      "cartão",
      "cartao",
      "cartões",
      "cartoes",
      "fatura",
      "faturas",
      "limite",
      "crédito",
      "credito",
      "disponível",
      "disponivel",
      "vencimento",
      "vence",
    ],
  },
  {
    intent: "get_subscription_analysis",
    keywords: [
      "assinatura",
      "assinaturas",
      "recorrência",
      "recorrencia",
      "recorrente",
      "recorrentes",
      "mensalidade",
      "mensalidades",
      "netflix",
      "spotify",
      "amazon",
      "streaming",
      "plano",
      "assino",
    ],
  },
  {
    intent: "get_monthly_balance",
    keywords: [
      "saldo",
      "balanço",
      "balanco",
      "receita",
      "receitas",
      "despesa",
      "despesas",
      "gasto",
      "gastos",
      "gastei",
      "recebi",
      "mensal",
      "mês",
      "mes",
      "fluxo",
      "sobrou",
      "entrou",
      "saiu",
    ],
  },
];

/**
 * Detecta a intent da mensagem do usuário por correspondência de palavras-chave.
 * Retorna `"unknown"` quando nenhuma keyword corresponde.
 */
export function detectIntent(message: string): IntentName {
  const normalized = message.toLowerCase();

  for (const { intent, keywords } of INTENT_KEYWORDS) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return intent;
      }
    }
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Helpers de data — mês corrente
// ---------------------------------------------------------------------------

/** Retorna o primeiro dia do mês corrente no formato YYYY-MM-DD. */
function getCurrentMonthStart(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/** Retorna o primeiro dia do mês seguinte no formato YYYY-MM-DD (exclusive end). */
function getNextMonthStart(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const nextMonth = month === 11 ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
  const y = nextMonth.getFullYear();
  const m = String(nextMonth.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

// ---------------------------------------------------------------------------
// 2.3 — Mapeamento de intent → tool MCP + argumentos obrigatórios
// ---------------------------------------------------------------------------

/**
 * Monta os argumentos obrigatórios para a tool MCP correspondente à intent.
 * Datas padrão: mês corrente (início até início do próximo mês, exclusive).
 */
export function buildMcpArgs(
  intent: Exclude<IntentName, "unknown">,
  tenantId: string,
): Record<string, unknown> {
  const startDate = getCurrentMonthStart();
  const endDate = getNextMonthStart();

  switch (intent) {
    case "get_monthly_balance":
      return { tenant_id: tenantId, start_date: startDate, end_date: endDate };

    case "get_subscription_analysis":
      return { tenant_id: tenantId, start_date: startDate, end_date: endDate };

    case "get_credit_card_status":
      // Esta tool não recebe datas — consulta o estado atual dos cartões
      return { tenant_id: tenantId };
  }
}

// ---------------------------------------------------------------------------
// 2.4 — Naturalização por template (pt-BR, máx 3 frases)
// ---------------------------------------------------------------------------

/** Formata valor monetário para pt-BR, ex.: 1234.5 → "R$ 1.234,50" */
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Nome do mês em português (0-indexed). */
const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Retorna o nome do mês de referência (0-indexed). */
function mesNome(month: number): string {
  return MESES_PT[month] ?? String(month);
}

// ---------------------------------------------------------------------------

interface MonthlyBalanceRow {
  year: number;
  month: number;
  receitas_reais: number;
  despesas_reais: number;
  saldo_operacional: number;
  total_transacoes: number;
}

/**
 * Naturaliza o payload de `get_monthly_balance`.
 * Extrai o mês mais recente do array e formata em até 3 frases.
 */
function naturalizeMonthlyBalance(data: unknown): string {
  if (!Array.isArray(data) || data.length === 0) {
    return "Ainda não há movimentações registradas para o mês atual.";
  }

  // Usa o registro de maior year/month (mais recente)
  const rows = data as MonthlyBalanceRow[];
  const latest = rows.reduce((best, row) =>
    row.year > best.year || (row.year === best.year && row.month > best.month) ? row : best,
  );

  const mes = mesNome(latest.month - 1);
  const receitas = formatBRL(latest.receitas_reais ?? 0);
  const despesas = formatBRL(latest.despesas_reais ?? 0);
  const saldo = formatBRL(latest.saldo_operacional ?? 0);
  const saldoPositivo = (latest.saldo_operacional ?? 0) >= 0;

  return (
    `Em ${mes} de ${latest.year}, suas receitas foram ${receitas} e as despesas totalizaram ${despesas}. ` +
    `O saldo operacional do mês foi de ${saldo}. ` +
    (saldoPositivo
      ? "Você terminou o mês no positivo — bom resultado!"
      : "O mês fechou no negativo; vale revisar os gastos.")
  );
}

// ---------------------------------------------------------------------------

interface Subscription {
  servico: string;
  total: number;
  count: number;
}

interface SubscriptionAnalysisPayload {
  subscriptions: Subscription[];
  stopped: Array<{ servico: string }>;
}

/**
 * Naturaliza o payload de `get_subscription_analysis`.
 */
function naturalizeSubscriptionAnalysis(data: unknown): string {
  const payload = data as SubscriptionAnalysisPayload;
  const subs = Array.isArray(payload?.subscriptions) ? payload.subscriptions : [];
  const stopped = Array.isArray(payload?.stopped) ? payload.stopped : [];

  if (subs.length === 0) {
    return "Não foram encontradas assinaturas ou cobranças recorrentes no período atual.";
  }

  const total = subs.reduce((acc, s) => acc + (s.total ?? 0), 0);
  const nomes = subs
    .slice(0, 3)
    .map((s) => s.servico)
    .join(", ");

  const parteNomes = subs.length > 3 ? `${nomes} e outras` : nomes;
  const parteStop =
    stopped.length > 0
      ? ` ${stopped.length} assinatura(s) deixaram de ser cobradas recentemente.`
      : "";

  return (
    `Você possui ${subs.length} assinatura(s) ativa(s) neste período, totalizando ${formatBRL(total)}. ` +
    `Principais serviços: ${parteNomes}.` +
    parteStop
  );
}

// ---------------------------------------------------------------------------

interface CreditCard {
  nome: string;
  saldo: number;
  limite: number | null;
  disponivel: number | null;
  vencimento: string | null;
  status: string;
}

interface CreditCardStatusPayload {
  cards: CreditCard[];
  ultimas_faturas_pagas: Array<{ valor: number }>;
}

/**
 * Naturaliza o payload de `get_credit_card_status`.
 */
function naturalizeCreditCardStatus(data: unknown): string {
  const payload = data as CreditCardStatusPayload;
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];

  if (cards.length === 0) {
    return "Nenhum cartão de crédito encontrado na sua conta.";
  }

  // Destaca o cartão com menor crédito disponível (mais crítico)
  const critico = cards.reduce((worst, card) => {
    const dispAtual = card.disponivel ?? Infinity;
    const dispWorse = worst.disponivel ?? Infinity;
    return dispAtual < dispWorse ? card : worst;
  });

  const disponivel =
    critico.disponivel !== null ? formatBRL(critico.disponivel) : "indisponível";
  const vencimento = critico.vencimento
    ? ` com vencimento em ${critico.vencimento}`
    : "";

  const statusMsg =
    critico.status === "estourado"
      ? "Atenção: esse cartão está com limite estourado!"
      : critico.status === "critico"
      ? "Atenção: crédito disponível abaixo de 10% do limite."
      : `Crédito disponível: ${disponivel}.`;

  return (
    `Você tem ${cards.length} cartão(ões) de crédito cadastrado(s). ` +
    `O cartão "${critico.nome}"${vencimento} possui ${disponivel} de crédito disponível. ` +
    statusMsg
  );
}

// ---------------------------------------------------------------------------
// 2.5 — Fallback seguro para payload inesperado
// ---------------------------------------------------------------------------

/**
 * Tenta parsear o texto retornado pelo MCP como JSON e delegar ao naturalizador.
 * Em caso de falha no parse ou estrutura inesperada, retorna mensagem amigável
 * sem expor JSON bruto, stacktrace ou detalhes internos.
 */
function naturalizePayload(intent: Exclude<IntentName, "unknown">, rawText: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Payload não é JSON válido — fallback silencioso
    return FALLBACK_MESSAGE;
  }

  try {
    switch (intent) {
      case "get_monthly_balance":
        return naturalizeMonthlyBalance(parsed);
      case "get_subscription_analysis":
        return naturalizeSubscriptionAnalysis(parsed);
      case "get_credit_card_status":
        return naturalizeCreditCardStatus(parsed);
    }
  } catch {
    // Estrutura inesperada no payload — fallback silencioso
    return FALLBACK_MESSAGE;
  }
}

/** Mensagem de fallback segura exibida quando a intent é desconhecida ou ocorre erro. */
const FALLBACK_MESSAGE =
  "Desculpe, não consegui entender sua pergunta. Tente perguntar sobre seu saldo mensal, assinaturas ou cartões de crédito.";

/** Mensagem exibida quando o servidor MCP está indisponível. */
const MCP_UNAVAILABLE_MESSAGE =
  "O serviço de análise financeira está temporariamente indisponível. Tente novamente em instantes.";

// ---------------------------------------------------------------------------
// Ponto de entrada do orquestrador
// ---------------------------------------------------------------------------

/**
 * Orquestra uma mensagem de chat via servidor MCP.
 *
 * @param message  Mensagem do usuário (texto livre).
 * @param tenantId UUID do tenant autenticado (NÃO vem do body da requisição).
 * @returns        Resposta naturalizada em pt-BR, em no máximo 3 frases.
 */
export async function orchestrateChat(message: string, tenantId: string): Promise<string> {
  const intent = detectIntent(message);
  console.log("🚀 ~ orchestrateChat ~ intent:", intent)

  // Intent desconhecida — fallback imediato sem chamar o MCP
  if (intent === "unknown") {
    return FALLBACK_MESSAGE;
  }

  const args = buildMcpArgs(intent, tenantId);
  console.log("🚀 ~ orchestrateChat ~ args:", args)

  let rawText: string;
  try {
    rawText = await callMcpTool(intent, args);
  } catch (err) {
    // Timeout ou indisponibilidade do servidor MCP
    if (err instanceof McpTimeoutError) {
      return MCP_UNAVAILABLE_MESSAGE;
    }
    // Erro retornado pela tool (ex.: tenant inválido, dados inexistentes)
    if (err instanceof McpToolError) {
      return FALLBACK_MESSAGE;
    }
    // Resposta malformada — não deve vazar detalhes ao usuário
    if (err instanceof McpParseError) {
      return FALLBACK_MESSAGE;
    }
    // Erro de rede ou outro erro inesperado — não expõe detalhes internos
    return MCP_UNAVAILABLE_MESSAGE;
  }

  return naturalizePayload(intent, rawText);
}
