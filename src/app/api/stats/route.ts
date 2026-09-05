import { authorize } from "@/lib/route-auth";
import { successResponse } from "@/lib/http";
import { getPersistentAgents, getPersistentEvents, getPersistentTransactions } from "@/lib/persistent-store";
export async function GET(request: Request) {
  const auth = await authorize(request); if (auth.response) return auth.response;
  const [transactions, agents, events] = await Promise.all([getPersistentTransactions(auth.session!.id), getPersistentAgents(auth.session!.id), getPersistentEvents(auth.session!.id)]);
  return successResponse(request, { total: transactions.length, allowed: transactions.filter((item) => item.decision === "ALLOW").length, review: transactions.filter((item) => item.decision === "REVIEW").length, blocked: transactions.filter((item) => item.decision === "BLOCK").length, activeAgents: agents.filter((item) => item.status === "ACTIVE").length, threats: events.filter((item) => item.severity === "HIGH" || item.severity === "CRITICAL").length, averageRisk: transactions.length ? Math.round(transactions.reduce((sum, item) => sum + item.riskScore, 0) / transactions.length) : 0 });
}
