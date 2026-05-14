import { errorResponse } from "./helpers.ts";
import { handleCashflow, handleCashflowProjetado } from "./routes/cashflow.ts";
import { handleGastos } from "./routes/gastos.ts";
import { handleCompromissos } from "./routes/compromissos.ts";
import { handleRunway } from "./routes/runway.ts";
import { handlePatrimonio } from "./routes/patrimonio.ts";
import { handleInvestimentos } from "./routes/investimentos.ts";
import { handleDigest } from "./routes/digest.ts";
import { handleTransacoes } from "./routes/transacoes.ts";
import { handleMeses } from "./routes/meses.ts";

export async function router(req: Request, url: URL): Promise<Response> {
  const path = url.pathname;

  if (path === "/api/cashflow" && req.method === "GET") return handleCashflow(req, url);
  if (path === "/api/cashflow/projetado" && req.method === "GET") return handleCashflowProjetado(req, url);
  if (path === "/api/gastos" && req.method === "GET") return handleGastos(req, url);
  if (path === "/api/compromissos" && req.method === "GET") return handleCompromissos(req, url);
  if (path === "/api/runway" && req.method === "GET") return handleRunway(req, url);
  if (path === "/api/patrimonio" && req.method === "GET") return handlePatrimonio(req, url);
  if (path === "/api/investimentos" && req.method === "GET") return handleInvestimentos(req, url);
  if (path === "/api/digest" && req.method === "GET") return handleDigest(req, url);
  if (path === "/api/transacoes" && req.method === "GET") return handleTransacoes(req, url);
  if (path === "/api/meses" && req.method === "GET") return handleMeses(req, url);

  return errorResponse("Not found", 404);
}
