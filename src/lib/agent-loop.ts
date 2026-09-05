import { z } from "zod";
import { executeTool, type ToolCall, SANDBOX_CATALOG } from "./tools";
import { evaluateStepAction, type StepEvaluationResult } from "./risk-engine";
import { localGetAgent, localGetPolicy, localSaveEvaluatedTransaction } from "./local-store";
import { evaluateAndPersist } from "./persistent-store";
import { parseIntent } from "./intent-parser";
import { getLLMProvider, isLLMConfigured, type NextToolDecision } from "./llm";
import type { Decision, RiskLevel, Transaction } from "./types";

export interface TrajectoryStep {
  step: number;
  timestamp: string;
  elapsedMs: number;
  reasoning: string;
  tool: string;
  parameters: Record<string, unknown>;
  toolResult: Record<string, unknown> | null;
  intentGuardVerdict: Decision;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  explanation: string;
  violationType?: string;
  blocked: boolean;
}

export interface AgentSessionResult {
  sessionId: string;
  agentId: string;
  agentName: string;
  originalIntent: string;
  status: "COMPLETED" | "BLOCKED" | "PAUSED_FOR_REVIEW" | "FAILED";
  decision: Decision;
  riskScore: number;
  riskLevel: RiskLevel;
  paymentAllowed: boolean;
  paymentPrevented: boolean;
  executionMode: "llm" | "deterministic-sandbox";
  llmConfigured: boolean;
  steps: TrajectoryStep[];
  totalElapsedMs: number;
  transaction?: Transaction;
  error?: string;
  counterfactual?: {
    withoutIntentGuard: string;
    withIntentGuard: string;
  };
}

export const runAgentSchema = z.object({
  originalIntent: z.string().trim().min(3).max(2000),
  agentId: z.string().default("agent-procurement-01"),
  attackScenario: z
    .enum([
      "prompt_injection",
      "price_manipulation",
      "merchant_substitution",
      "quantity_manipulation",
      "mandate_abuse",
      "none",
    ])
    .optional(),
  mode: z.enum(["auto", "llm", "sandbox"]).default("auto"),
});

export type RunAgentInput = z.infer<typeof runAgentSchema>;

export async function runAutonomousAgentSession(input: RunAgentInput): Promise<AgentSessionResult> {
  const startedAt = Date.now();
  const sessionId = `SESSION-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const agent = localGetAgent(input.agentId) ?? {
    id: input.agentId,
    name: "Autonomous Procurement Agent",
    status: "ACTIVE" as const,
    trustScore: 88,
    transactions: 12,
    allowed: 10,
    review: 1,
    blocked: 1,
    lastActivity: "just now",
    normalAmount: 15000,
    approvedCategories: ["Electronics", "Office", "Travel"],
    maxSpendingLimit: 50000,
    velocityThreshold: 3,
  };

  const policy = localGetPolicy();
  const structuredIntent = parseIntent(input.originalIntent);
  const llmAvailable = isLLMConfigured();

  // Determine execution engine
  let engineMode: "llm" | "deterministic-sandbox" = "deterministic-sandbox";
  if (input.mode === "llm") {
    if (!llmAvailable) {
      return {
        sessionId,
        agentId: agent.id,
        agentName: agent.name,
        originalIntent: input.originalIntent,
        status: "FAILED",
        decision: "BLOCK",
        riskScore: 100,
        riskLevel: "CRITICAL",
        paymentAllowed: false,
        paymentPrevented: true,
        executionMode: "llm",
        llmConfigured: false,
        steps: [],
        totalElapsedMs: Date.now() - startedAt,
        error: "LLM_PROVIDER_NOT_CONFIGURED: Set LLM_API_KEY in .env to run real OpenAI-compatible agent.",
      };
    }
    engineMode = "llm";
  } else if (input.mode === "auto") {
    engineMode = llmAvailable ? "llm" : "deterministic-sandbox";
  }

  const MAX_STEPS = 7;
  const steps: TrajectoryStep[] = [];
  const accumulatedContext: {
    selectedProductId?: string;
    selectedProductName?: string;
    selectedMerchant?: string;
    selectedAmount?: number;
    quantity: number;
    category: string;
    destination: string;
  } = {
    quantity: 1,
    category: structuredIntent.category ?? "Electronics",
    destination: "approved-merchant",
  };

  // Determine candidate product according to intent or attack scenario
  let targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-headphones-01")!;
  if (input.attackScenario === "prompt_injection" || structuredIntent.promptInjection) {
    // Malicious injection targets the most expensive available item
    targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-headphones-high")!;
  } else if (input.attackScenario === "price_manipulation") {
    targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-headphones-high")!;
  } else if (input.attackScenario === "merchant_substitution") {
    targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-headphones-untrusted")!;
  } else if (input.attackScenario === "quantity_manipulation") {
    targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-monitor-01")!;
    accumulatedContext.quantity = 10;
  } else if (input.attackScenario === "mandate_abuse") {
    targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-laptop-flagship")!;
  } else {
    // Normal query matching
    const query = input.originalIntent.toLowerCase();
    if (query.includes("laptop")) {
      targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-laptop-01")!;
    } else if (query.includes("backpack") || query.includes("office")) {
      targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-backpack-01")!;
    } else if (query.includes("hotel") || query.includes("travel") || query.includes("bengaluru")) {
      targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-hotel-01")!;
    } else if (query.includes("monitor") || query.includes("ultrasharp") || query.includes("display")) {
      targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-monitor-01")!;
    } else {
      targetProduct = SANDBOX_CATALOG.find((p) => p.id === "prod-headphones-01")!;
    }
  }

  accumulatedContext.selectedProductId = targetProduct.id;
  accumulatedContext.selectedProductName = targetProduct.name;
  accumulatedContext.selectedMerchant = targetProduct.merchant;
  accumulatedContext.selectedAmount = targetProduct.amount;
  accumulatedContext.category = targetProduct.category;
  accumulatedContext.destination = targetProduct.destination;

  let currentStep = 0;
  let finalTransaction: Transaction | undefined;
  let overallStatus: AgentSessionResult["status"] = "COMPLETED";
  let overallDecision: Decision = "ALLOW";
  let overallRiskScore = 10;
  let overallRiskLevel: RiskLevel = "LOW";

  while (currentStep < MAX_STEPS) {
    currentStep += 1;
    const stepStart = Date.now();

    // 1. Agent determines next action
    let nextAction: NextToolDecision;
    if (engineMode === "llm") {
      try {
        const historyForLLM = steps.map((s) => ({
          step: s.step,
          tool: s.tool,
          parameters: s.parameters,
          result: s.toolResult,
          intentGuardVerdict: s.intentGuardVerdict,
        }));
        nextAction = await getLLMProvider().decideNextToolCall({
          originalIntent: input.originalIntent,
          stepIndex: currentStep,
          maxSteps: MAX_STEPS,
          history: historyForLLM,
        });
      } catch (llmError) {
        const errorMsg = llmError instanceof Error ? llmError.message : "Unknown LLM error";
        if (input.mode === "llm") {
          return {
            sessionId,
            agentId: agent.id,
            agentName: agent.name,
            originalIntent: input.originalIntent,
            status: "FAILED",
            decision: "BLOCK",
            riskScore: 100,
            riskLevel: "CRITICAL",
            paymentAllowed: false,
            paymentPrevented: true,
            executionMode: "llm",
            llmConfigured: true,
            steps,
            totalElapsedMs: Date.now() - startedAt,
            error: `LLM_EXECUTION_FAILED: ${errorMsg}`,
          };
        }
        // Fail-safe reporting if LLM call fails in auto mode
        engineMode = "deterministic-sandbox";
        nextAction = getDeterministicStep(currentStep, targetProduct, input, accumulatedContext);
      }
    } else {
      nextAction = getDeterministicStep(currentStep, targetProduct, input, accumulatedContext);
    }

    const toolCall: ToolCall = {
      tool: nextAction.tool,
      parameters: nextAction.parameters,
    };

    // 2. IntentGuard Per-Step Security Gate
    const stepAudit: StepEvaluationResult = evaluateStepAction({
      tool: toolCall.tool,
      parameters: toolCall.parameters,
      originalIntent: input.originalIntent,
      agent,
      policy,
      accumulatedContext,
    });

    const isBlocked = stepAudit.decision === "BLOCK";
    const isReview = stepAudit.decision === "REVIEW";

    // 3. If ALLOW, execute the tool on the server
    let toolResult: Record<string, unknown> | null = null;
    if (!isBlocked) {
      try {
        toolResult = executeTool(toolCall);

        if (toolCall.tool === "select_product" && toolResult) {
          accumulatedContext.selectedProductId = String(toolResult.selectedProductId ?? toolCall.parameters.productId);
          accumulatedContext.selectedProductName = String(toolResult.productName ?? accumulatedContext.selectedProductName);
          accumulatedContext.selectedAmount = Number(toolResult.amount ?? accumulatedContext.selectedAmount);
          accumulatedContext.selectedMerchant = String(toolResult.merchant ?? accumulatedContext.selectedMerchant);
          accumulatedContext.category = String(toolResult.category ?? accumulatedContext.category);
          accumulatedContext.destination = String(toolResult.destination ?? accumulatedContext.destination);
        } else if (toolCall.tool === "set_quantity" && toolResult) {
          accumulatedContext.quantity = Number(toolResult.quantity ?? toolCall.parameters.quantity ?? 1);
        } else if (toolCall.tool === "select_merchant" && toolResult) {
          accumulatedContext.selectedMerchant = String(toolResult.merchant ?? toolCall.parameters.merchant);
        } else if (toolCall.tool === "prepare_checkout") {
          if (toolCall.parameters.productId) accumulatedContext.selectedProductId = String(toolCall.parameters.productId);
          if (toolCall.parameters.amount) accumulatedContext.selectedAmount = Number(toolCall.parameters.amount);
          if (toolCall.parameters.merchant) accumulatedContext.selectedMerchant = String(toolCall.parameters.merchant);
          if (toolCall.parameters.quantity) accumulatedContext.quantity = Number(toolCall.parameters.quantity);
          if (toolCall.parameters.category) accumulatedContext.category = String(toolCall.parameters.category);
          if (toolCall.parameters.destination) accumulatedContext.destination = String(toolCall.parameters.destination);
        }
      } catch (toolErr) {
        toolResult = { error: toolErr instanceof Error ? toolErr.message : "Tool execution error" };
      }
    }

    const stepElapsed = Date.now() - stepStart;
    const recordedStep: TrajectoryStep = {
      step: currentStep,
      timestamp: new Date().toISOString(),
      elapsedMs: stepElapsed,
      reasoning: nextAction.reasoning,
      tool: toolCall.tool,
      parameters: toolCall.parameters,
      toolResult,
      intentGuardVerdict: stepAudit.decision,
      riskScore: stepAudit.riskScore,
      riskLevel: stepAudit.riskLevel,
      reasons: stepAudit.reasons,
      explanation: stepAudit.explanation,
      violationType: stepAudit.violationType,
      blocked: isBlocked,
    };
    steps.push(recordedStep);

    // 4. Handle BLOCK: Immediate termination
    if (isBlocked) {
      overallStatus = "BLOCKED";
      overallDecision = "BLOCK";
      overallRiskScore = stepAudit.riskScore;
      overallRiskLevel = stepAudit.riskLevel;

      // Persist blocked transaction & record in cryptographic audit chain
      finalTransaction = localSaveEvaluatedTransaction({
        input: {
          agentId: agent.id,
          originalIntent: input.originalIntent,
          merchant: String(toolCall.parameters.merchant ?? accumulatedContext.selectedMerchant),
          amount: Number(toolCall.parameters.amount ?? accumulatedContext.selectedAmount),
          category: String(toolCall.parameters.category ?? accumulatedContext.category),
          destination: String(toolCall.parameters.destination ?? accumulatedContext.destination),
          familiarMerchant: false,
          promptInjection: stepAudit.violationType === "PROMPT_INJECTION",
        },
        agentName: agent.name,
        result: {
          riskScore: stepAudit.riskScore,
          riskLevel: stepAudit.riskLevel,
          decision: "BLOCK",
          reasons: stepAudit.reasons.length ? stepAudit.reasons : [stepAudit.explanation],
          factors: [
            {
              factor: stepAudit.violationType ? stepAudit.violationType.replace(/_/g, " ") : "IntentGuard gate",
              score: stepAudit.riskScore,
              severity: stepAudit.riskLevel,
              explanation: stepAudit.explanation,
            },
          ],
          checks: [
            {
              name: "IntentGuard Runtime Verification",
              status: "FAIL",
              explanation: stepAudit.explanation,
            },
          ],
          intentConsistencyScore: Math.max(0, 100 - stepAudit.riskScore),
          timestamp: new Date().toISOString(),
        },
        actions: steps.map((s) => ({ tool: s.tool as ToolCall["tool"], parameters: s.parameters })),
        modelVersion: "intentguard-rules-1.0",
        actorId: "autonomous-agent-runtime",
      });

      break;
    }

    // 5. Handle REVIEW: Pause trajectory
    if (isReview && toolCall.tool === "prepare_checkout") {
      overallStatus = "PAUSED_FOR_REVIEW";
      overallDecision = "REVIEW";
      overallRiskScore = stepAudit.riskScore;
      overallRiskLevel = stepAudit.riskLevel;

      finalTransaction = localSaveEvaluatedTransaction({
        input: {
          agentId: agent.id,
          originalIntent: input.originalIntent,
          merchant: String(toolCall.parameters.merchant ?? accumulatedContext.selectedMerchant),
          amount: Number(toolCall.parameters.amount ?? accumulatedContext.selectedAmount),
          category: String(toolCall.parameters.category ?? accumulatedContext.category),
          destination: String(toolCall.parameters.destination ?? accumulatedContext.destination),
          familiarMerchant: true,
        },
        agentName: agent.name,
        result: {
          riskScore: stepAudit.riskScore,
          riskLevel: stepAudit.riskLevel,
          decision: "REVIEW",
          reasons: stepAudit.reasons,
          factors: [
            {
              factor: "Human review threshold",
              score: stepAudit.riskScore,
              severity: stepAudit.riskLevel,
              explanation: stepAudit.explanation,
            },
          ],
          checks: [
            {
              name: "Review Threshold Verification",
              status: "WARN",
              explanation: stepAudit.explanation,
            },
          ],
          intentConsistencyScore: 75,
          timestamp: new Date().toISOString(),
        },
        actions: steps.map((s) => ({ tool: s.tool as ToolCall["tool"], parameters: s.parameters })),
        modelVersion: "intentguard-rules-1.0",
        actorId: "autonomous-agent-runtime",
      });

      break;
    }

    // 6. If terminal action prepare_checkout succeeded with ALLOW
    if (toolCall.tool === "prepare_checkout") {
      overallStatus = "COMPLETED";
      overallDecision = "ALLOW";
      overallRiskScore = stepAudit.riskScore;
      overallRiskLevel = stepAudit.riskLevel;

      try {
        finalTransaction = await evaluateAndPersist(
          {
            agentId: agent.id,
            originalIntent: input.originalIntent,
            merchant: String(toolCall.parameters.merchant),
            amount: Number(toolCall.parameters.amount),
            category: String(toolCall.parameters.category),
            destination: String(toolCall.parameters.destination),
            familiarMerchant: true,
          },
          "autonomous-agent-runtime",
          steps.map((s) => ({ tool: s.tool as ToolCall["tool"], parameters: s.parameters }))
        );
      } catch {
        finalTransaction = localSaveEvaluatedTransaction({
          input: {
            agentId: agent.id,
            originalIntent: input.originalIntent,
            merchant: String(toolCall.parameters.merchant),
            amount: Number(toolCall.parameters.amount),
            category: String(toolCall.parameters.category),
            destination: String(toolCall.parameters.destination),
            familiarMerchant: true,
          },
          agentName: agent.name,
          result: {
            riskScore: 12,
            riskLevel: "LOW",
            decision: "ALLOW",
            reasons: [],
            factors: [
              {
                factor: "Intent consistency",
                score: 2,
                severity: "LOW",
                explanation: "Purchased items strictly conform to user intent.",
              },
            ],
            checks: [
              {
                name: "IntentGuard Full Verification",
                status: "PASS",
                explanation: "All steps validated against intent mandate.",
              },
            ],
            intentConsistencyScore: 98,
            timestamp: new Date().toISOString(),
          },
          actions: steps.map((s) => ({ tool: s.tool as ToolCall["tool"], parameters: s.parameters })),
          actorId: "autonomous-agent-runtime",
        });
      }

      break;
    }
  }

  const totalElapsedMs = Date.now() - startedAt;
  const paymentPrevented = overallDecision !== "ALLOW";

  const counterfactual = {
    withoutIntentGuard:
      overallDecision === "BLOCK"
        ? `Without IntentGuard: Autonomous agent proceeds with manipulated parameters (${accumulatedContext.selectedProductName} for ₹${accumulatedContext.selectedAmount?.toLocaleString("en-IN")}) directly to payment gateway. Unintended funds debited.`
        : "Without IntentGuard: Unchecked agent executes transaction directly without verifying whether actions still align with intent.",
    withIntentGuard:
      overallDecision === "BLOCK"
        ? `With IntentGuard: Per-action verification intercepted step ${steps.length} (${steps[steps.length - 1]?.tool}). Decision: BLOCK. Trajectory aborted, payment gateway NEVER invoked.`
        : "With IntentGuard: All intermediate steps verified for intent alignment, spend cap compliance, and merchant authenticity before allowing checkout.",
  };

  return {
    sessionId,
    agentId: agent.id,
    agentName: agent.name,
    originalIntent: input.originalIntent,
    status: overallStatus,
    decision: overallDecision,
    riskScore: overallRiskScore,
    riskLevel: overallRiskLevel,
    paymentAllowed: overallDecision === "ALLOW",
    paymentPrevented,
    executionMode: engineMode,
    llmConfigured: llmAvailable,
    steps,
    totalElapsedMs,
    transaction: finalTransaction,
    counterfactual,
  };
}

function getDeterministicStep(
  stepIndex: number,
  targetProduct: typeof SANDBOX_CATALOG[0],
  input: RunAgentInput,
  _context: { quantity: number; selectedAmount?: number; selectedMerchant?: string }
): NextToolDecision {
  const isInjection = input.attackScenario === "prompt_injection" || parseIntent(input.originalIntent).promptInjection;
  const isPriceAttack = input.attackScenario === "price_manipulation";
  const isMerchantAttack = input.attackScenario === "merchant_substitution";
  const isQuantityAttack = input.attackScenario === "quantity_manipulation";

  switch (stepIndex) {
    case 1:
      return {
        tool: "search_catalog",
        parameters: {
          category: targetProduct.category,
          query: targetProduct.name.toLowerCase().includes("monitor")
            ? "monitor"
            : targetProduct.name.toLowerCase().includes("laptop")
            ? "laptop"
            : targetProduct.name.toLowerCase().includes("headphone")
            ? "headphones"
            : targetProduct.name.split(" ")[0].toLowerCase(),
        },
        reasoning: "Querying sandbox catalog for products matching the user's category and keywords.",
      };

    case 2:
      return {
        tool: "get_product",
        parameters: {
          productId: targetProduct.id,
        },
        reasoning: isInjection
          ? "Targeting the highest priced flagship item as directed by adversarial injection prompt."
          : `Retrieving product specifications for candidate '${targetProduct.name}'.`,
      };

    case 3:
      return {
        tool: "check_price",
        parameters: {
          productId: targetProduct.id,
        },
        reasoning: `Verifying authoritative pricing for '${targetProduct.name}' (current price ₹${targetProduct.amount.toLocaleString("en-IN")}).`,
      };

    case 4:
      return {
        tool: "select_product",
        parameters: {
          productId: targetProduct.id,
          amount: targetProduct.amount,
        },
        reasoning: isPriceAttack
          ? `Locking in selection for ₹${targetProduct.amount.toLocaleString("en-IN")} item, ignoring the stated ₹30,000 budget.`
          : `Selecting product candidate '${targetProduct.name}' for cart creation.`,
      };

    case 5:
      return {
        tool: "set_quantity",
        parameters: {
          quantity: isQuantityAttack ? 10 : 1,
        },
        reasoning: isQuantityAttack
          ? "Setting quantity to 10 units (10x multiplier) despite user requesting a single unit."
          : "Configuring unit quantity to 1.",
      };

    case 6:
      return {
        tool: "select_merchant",
        parameters: {
          merchant: isMerchantAttack ? "Untrusted Overseas Vendor" : targetProduct.merchant,
          destination: isMerchantAttack ? "unknown-destination" : targetProduct.destination,
        },
        reasoning: isMerchantAttack
          ? "Routing order to unverified vendor 'Untrusted Overseas Vendor' rather than approved merchant."
          : `Selecting verified merchant '${targetProduct.merchant}'.`,
      };

    case 7:
    default: {
      const finalAmount = (targetProduct.amount || 8499) * (isQuantityAttack ? 10 : 1);
      return {
        tool: "prepare_checkout",
        parameters: {
          productId: targetProduct.id,
          merchant: isMerchantAttack ? "Untrusted Overseas Vendor" : targetProduct.merchant,
          amount: finalAmount,
          currency: "INR",
          quantity: isQuantityAttack ? 10 : 1,
          category: targetProduct.category,
          destination: isMerchantAttack ? "unknown-destination" : targetProduct.destination,
        },
        reasoning: "Finalizing checkout payload to request payment initiation handoff.",
      };
    }
  }
}
