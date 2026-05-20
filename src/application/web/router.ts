import { SQL } from "bun";
import { errorResponse } from "./helpers.ts";
import { serveAdminPanel } from "./routes/admin/panel.ts";
import { handleAdminLogin } from "./routes/admin/login.ts";
import { handleCreateWorker, handleListWorkers, handleUpdateWorker, handleDeleteWorker, handleQueueStats } from "./routes/admin/workers.ts";
import { handleListTenants, handleCreateTenant, handleToggleTenantStatus } from "./routes/admin/tenants.ts";
import { handleDigestEnqueue, handleDigestQueueStats, handleForecastEnqueue, handleForecastQueueStats, handleDailyInsightEnqueue, handleDailyInsightQueueStats } from "./routes/admin/pipeline-queues.ts";
import { handleCashflow, handleCashflowProjetado } from "./routes/cashflow.ts";
import { handleGastos } from "./routes/gastos.ts";
import { handleCompromissos } from "./routes/compromissos.ts";
import { handleRunway } from "./routes/runway.ts";
import { handlePatrimonio } from "./routes/patrimonio.ts";
import { handleInvestimentos } from "./routes/investimentos.ts";
import { handleDigest } from "./routes/digest.ts";
import { handleTransacoes } from "./routes/transacoes.ts";
import { handleMeses } from "./routes/meses.ts";
import { handleTendencias } from "./routes/tendencias.ts";
import { handleLogin } from "./routes/auth.ts";
import { handleSync } from "./routes/sync.ts";
import { handleGetUsers, handleUpdateUser } from "./routes/users.ts";
import { handleGetGoals, handleCreateGoal, handleUpdateGoal, handleDeleteGoal } from "./routes/goals.ts";
import { handleForecastGroups } from "./routes/forecast/groups.ts";
import { handleForecastCategories } from "./routes/forecast/categories.ts";
import { handleForecastMessage } from "./routes/forecast/message.ts";
import { handleChat } from "./routes/chat.ts";
import { handleForecastDaily, handleForecastDailyRegenerate } from "./routes/forecast/daily.ts";
import { handleDailyCategoryExclusionPathPost, handleDailyCategoryExclusionsGet, handleDailyCategoryExclusionsPost, handleDailyExclusionsPost, handleDailyMessagesRange } from "./routes/forecast/daily-handlers.ts";

export async function router(req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const path = url.pathname;

  if (path === "/admin" && req.method === "GET") return serveAdminPanel();
  if (path === "/api/auth/login" && req.method === "POST") return handleLogin(req);

  // Admin routes (auth handled inside each handler via requireSuperAdmin)
  if (path === "/api/admin/login" && req.method === "POST") return handleAdminLogin(req);
  if (path === "/api/admin/tenants" && req.method === "GET") return handleListTenants(req, sql);
  if (path === "/api/admin/tenants" && req.method === "POST") return handleCreateTenant(req, sql);
  if (path.startsWith("/api/admin/tenants/") && req.method === "PATCH") return handleToggleTenantStatus(req, url, sql);
  if (path === "/api/admin/workers" && req.method === "POST") return handleCreateWorker(req, sql);
  if (path === "/api/admin/workers" && req.method === "GET") return handleListWorkers(req, sql);
  if (path.startsWith("/api/admin/workers/") && req.method === "PATCH") return handleUpdateWorker(req, url, sql);
  if (path.startsWith("/api/admin/workers/") && req.method === "DELETE") return handleDeleteWorker(req, url, sql);
  if (path === "/api/admin/queue-stats" && req.method === "GET") return handleQueueStats(req, sql);
  if (path === "/api/admin/digest/enqueue" && req.method === "POST") return handleDigestEnqueue(req, sql);
  if (path === "/api/admin/digest/queue-stats" && req.method === "GET") return handleDigestQueueStats(req, sql);
  if (path === "/api/admin/forecast/enqueue" && req.method === "POST") return handleForecastEnqueue(req, sql);
  if (path === "/api/admin/forecast/queue-stats" && req.method === "GET") return handleForecastQueueStats(req, sql);
  if (path === "/api/admin/daily-insight/enqueue" && req.method === "POST") return handleDailyInsightEnqueue(req, sql);
  if (path === "/api/admin/daily-insight/queue-stats" && req.method === "GET") return handleDailyInsightQueueStats(req, sql);

  if (path === "/api/sync" && req.method === "POST") return handleSync(req, tenantId, sql);
  if (path === "/api/users" && req.method === "GET") return handleGetUsers(req, tenantId, sql);
  if (path.startsWith("/api/users/") && req.method === "PATCH") return handleUpdateUser(req, url, tenantId, sql);
  if (path === "/api/goals" && req.method === "GET") return handleGetGoals(req, tenantId, sql);
  if (path === "/api/goals" && req.method === "POST") return handleCreateGoal(req, tenantId, sql);
  if (path.startsWith("/api/goals/") && req.method === "PUT") return handleUpdateGoal(req, url, tenantId, sql);
  if (path.startsWith("/api/goals/") && req.method === "DELETE") return handleDeleteGoal(req, url, tenantId, sql);
  if (path === "/api/cashflow" && req.method === "GET") return handleCashflow(req, url, tenantId, sql);
  if (path === "/api/cashflow/projetado" && req.method === "GET") return handleCashflowProjetado(req, url, tenantId, sql);
  if (path === "/api/gastos" && req.method === "GET") return handleGastos(req, url, tenantId, sql);
  if (path === "/api/compromissos" && req.method === "GET") return handleCompromissos(req, url, tenantId, sql);
  if (path === "/api/runway" && req.method === "GET") return handleRunway(req, url, tenantId, sql);
  if (path === "/api/patrimonio" && req.method === "GET") return handlePatrimonio(req, url, tenantId, sql);
  if (path === "/api/investimentos" && req.method === "GET") return handleInvestimentos(req, url, tenantId, sql);
  if (path === "/api/digest" && req.method === "GET") return handleDigest(req, url, tenantId, sql);
  if (path === "/api/transacoes" && req.method === "GET") return handleTransacoes(req, url, tenantId, sql);
  if (path === "/api/meses" && req.method === "GET") return handleMeses(req, url, tenantId, sql);
  if (path === "/api/tendencias" && req.method === "GET") return handleTendencias(req, url, tenantId, sql);
  if (path === "/api/forecast/groups" && req.method === "GET") return handleForecastGroups(req, tenantId, sql);
  if (path === "/api/forecast/categories" && req.method === "GET") return handleForecastCategories(req, tenantId, sql);
  if (path === "/api/forecast/message" && req.method === "GET") return handleForecastMessage(req, tenantId, sql);
  if (path === "/api/chat" && req.method === "POST") return handleChat(req, tenantId);
  if (path === "/api/forecast/daily" && req.method === "GET") return handleForecastDaily(req, tenantId, sql);
  if (path === "/api/forecast/daily/regenerate" && req.method === "POST") return handleForecastDailyRegenerate(req, tenantId, sql);

  if (path === "/api/forecast/daily/exclusions" && req.method === "GET") return handleDailyCategoryExclusionsGet(req, tenantId, sql);
  if (path.startsWith("/api/forecast/daily/exclusions/") && req.method === "POST") return handleDailyCategoryExclusionPathPost(req, url, tenantId, sql);
  if (path === "/api/forecast/daily/category-exclusions" && req.method === "GET") return handleDailyCategoryExclusionsGet(req, tenantId, sql);
  if (path === "/api/forecast/daily/category-exclusions" && req.method === "POST") return handleDailyCategoryExclusionsPost(req, tenantId, sql);
  if (path === "/api/forecast/daily/daily-exclusions" && req.method === "POST") return handleDailyExclusionsPost(req, tenantId, sql);
  if (path === "/api/forecast/daily/messages-range" && req.method === "GET") return handleDailyMessagesRange(req, tenantId, sql);

  return errorResponse("Not found", 404);
}
