import { evaluateTransaction } from "./risk-engine";
import type { Agent as DomainAgent, Transaction, TransactionInput } from "./types";
import type { ToolCall } from "./tools";
import { parseIntent } from "./intent-parser";
import { predictRisk } from "./ml-inference";
import { investigate } from "./investigator";
import {
  localGetAgents,
  localGetAgent,
  localGetTransactions,
  localGetTransaction,
  localSaveEvaluatedTransaction,
  localGetSecurityEvents,
  localGetAuditRecords,
  localGetPolicy,
} from "./local-store";

export async function getPersistentAgents(_userId?: string): Promise<DomainAgent[]> {
  return localGetAgents();
}

export async function evaluateAndPersist(input: TransactionInput, userId: string, actions: ToolCall[] = []): Promise<Transaction> {
  const agent = localGetAgent(input.agentId);
  if (!agent) throw new Error("Unknown agent");
  if (agent.status === "PAUSED") throw new Error("Agent is paused");

  const policy = localGetPolicy();
  const familiarMerchant = policy.allowedMerchants.includes(input.merchant);

  const existingTransactions = localGetTransactions();
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const recentCount = existingTransactions.filter(
    (t) => t.agentId === agent.id && new Date(t.timestamp).getTime() >= fiveMinAgo
  ).length;

  const structuredIntent = parseIntent(input.originalIntent);
  const canonicalInput: TransactionInput = {
    ...input,
    familiarMerchant,
    velocityCount: recentCount + 1,
    promptInjection: structuredIntent.promptInjection,
  };

  const domainAgent: DomainAgent = {
    ...agent,
    approvedCategories: policy.allowedCategories,
    maxSpendingLimit: policy.maxSpendingLimit ?? undefined,
    velocityThreshold: policy.velocityThreshold,
    requiresReviewAbove: policy.requiresReviewAbove ?? undefined,
  };

  const result = evaluateTransaction(canonicalInput, domainAgent);

  const spendUtilization = policy.maxSpendingLimit ? input.amount / policy.maxSpendingLimit : 0;
  const ml = await predictRisk({
    amount: spendUtilization,
    spend_cap_utilization: spendUtilization,
    merchant_familiar: familiarMerchant ? 1 : 0,
    category_match: policy.allowedCategories.includes(input.category) ? 1 : 0,
    quantity: 1,
    trajectory_steps: actions.length || 1,
    price_change: (result.factors.find((f) => f.factor === "Intent consistency")?.score ?? 0) / 42,
    merchant_change: familiarMerchant ? 0 : 1,
    product_change: 0,
    velocity: canonicalInput.velocityCount ?? 1,
    mandate_valid: 1,
    suspicious_sequence: (canonicalInput.velocityCount ?? 1) > policy.velocityThreshold ? 1 : 0,
    prompt_injection: canonicalInput.promptInjection ? 1 : 0,
    previous_risk: 0,
  });

  const mlElevated = ml?.risk_prediction === 1 && result.decision === "ALLOW";
  const effectiveDecision = mlElevated ? ("REVIEW" as const) : result.decision;

  const investigator = await investigate(
    { input: canonicalInput, factors: result.factors, checks: result.checks, ml },
    effectiveDecision !== "ALLOW"
  );

  const effectiveResult = {
    ...result,
    decision: effectiveDecision,
    riskScore: Math.max(result.riskScore, Math.round((ml?.risk_probability ?? 0) * 100)),
  };

  const transaction = localSaveEvaluatedTransaction({
    input: canonicalInput,
    agentName: agent.name,
    result: effectiveResult,
    actions,
    investigator,
    modelVersion: ml?.model_version ?? "intentguard-rules-1.0",
    mlScore: ml?.risk_probability ? ml.risk_probability * 100 : null,
    actorId: userId,
  });

  return transaction;
}

export async function getPersistentTransactions(_userId?: string): Promise<Transaction[]> {
  return localGetTransactions();
}

export async function getPersistentTransaction(id: string, _userId?: string): Promise<Transaction | undefined> {
  return localGetTransaction(id);
}

export async function getPersistentEvents(_userId?: string) {
  return localGetSecurityEvents();
}

export async function getPersistentAudits(_userId?: string) {
  return localGetAuditRecords();
}

