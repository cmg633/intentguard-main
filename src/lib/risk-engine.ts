import { Agent, RiskFactor, SecurityCheck, TransactionInput, Decision, RiskLevel } from "./types";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function levelFor(score: number): RiskLevel {
  if (score < 30) return "LOW";
  if (score < 60) return "MEDIUM";
  if (score < 80) return "HIGH";
  return "CRITICAL";
}

function severityFor(score: number): RiskFactor["severity"] {
  if (score < 10) return "LOW";
  if (score < 20) return "MEDIUM";
  if (score < 30) return "HIGH";
  return "CRITICAL";
}

export function evaluateTransaction(input: TransactionInput, agent: Agent, now = new Date()) {
  const amountDeviation = Math.max(0, (input.amount - agent.normalAmount) / agent.normalAmount);
  const intentLimit = input.originalIntent.match(/(?:under|below|less than)\s*[₹$]?\s*([\d,]+)/i)?.[1];
  const parsedLimit = intentLimit ? Number(intentLimit.replace(/,/g, "")) : undefined;
  const intentDrift = parsedLimit ? Math.max(0, (input.amount - parsedLimit) / parsedLimit) : 0;
  const velocity = input.velocityCount ?? 1;
  const promptInjection = input.promptInjection === true;
  const policyViolation = !agent.approvedCategories.includes(input.category) || !input.familiarMerchant || input.destination.toLowerCase().includes("unknown") || (agent.maxSpendingLimit !== undefined && input.amount > agent.maxSpendingLimit) || (parsedLimit !== undefined && input.amount > parsedLimit * 1.1);

  const factors: RiskFactor[] = [
    { factor: "Agent trust", score: clamp((100 - agent.trustScore) * 0.25), severity: severityFor((100 - agent.trustScore) * 0.25), explanation: agent.trustScore >= 85 ? "Agent identity has a strong established trust score." : "Agent trust is below the configured confidence threshold." },
    { factor: "Amount anomaly", score: clamp(amountDeviation * 32), severity: severityFor(amountDeviation * 32), explanation: amountDeviation > 0.75 ? "Amount is significantly above the agent's normal spending range." : amountDeviation > 0.3 ? "Amount is above the agent's typical transaction size." : "Amount is within the agent's normal spending range." },
    { factor: "Intent consistency", score: clamp(intentDrift * 42), severity: severityFor(intentDrift * 42), explanation: intentDrift > 0 ? `Action exceeds the stated limit by ${Math.round(intentDrift * 100)}%.` : "Action is consistent with the user's stated intent." },
    { factor: "Merchant familiarity", score: input.familiarMerchant ? 2 : 18, severity: input.familiarMerchant ? "LOW" : "HIGH", explanation: input.familiarMerchant ? "Merchant is in the agent's established transaction history." : "Merchant is unfamiliar to this agent." },
    { factor: "Transaction velocity", score: clamp(Math.max(0, velocity - (agent.velocityThreshold ?? 3)) * 12), severity: severityFor(Math.max(0, velocity - (agent.velocityThreshold ?? 3)) * 12), explanation: velocity > (agent.velocityThreshold ?? 3) ? `${velocity} transactions detected in the active monitoring window.` : "Transaction cadence is within expected limits." },
    { factor: "Destination risk", score: input.destination.includes("unknown") ? 22 : 3, severity: input.destination.includes("unknown") ? "HIGH" : "LOW", explanation: input.destination.includes("unknown") ? "Destination has not been previously approved for this agent." : "Destination is recognized and permitted." },
    { factor: "Policy compliance", score: policyViolation ? 24 : 2, severity: policyViolation ? "HIGH" : "LOW", explanation: policyViolation ? "Transaction conflicts with an agent category or spending policy." : "Transaction satisfies configured spending policies." },
    { factor: "Prompt injection defense", score: promptInjection ? 40 : 0, severity: promptInjection ? "CRITICAL" : "LOW", explanation: promptInjection ? "Instruction-like content attempted to override the user's mandate." : "No mandate override instructions detected." },
  ];
  const riskScore = clamp(factors.reduce((sum, factor) => sum + factor.score, 0));
  const riskLevel = levelFor(riskScore);
  const decision: Decision = riskLevel === "CRITICAL" ? "BLOCK" : riskLevel === "HIGH" ? "REVIEW" : riskLevel === "MEDIUM" && policyViolation ? "REVIEW" : "ALLOW";
  const checks: SecurityCheck[] = [
    { name: "Agent Identity", status: agent.trustScore >= 70 ? "PASS" : "WARN", explanation: agent.trustScore >= 70 ? "Agent identity verified." : "Agent identity requires additional confidence." },
    { name: "Intent Consistency", status: intentDrift > 0.1 ? "FAIL" : "PASS", explanation: intentDrift > 0.1 ? "Actual amount materially diverges from the original intent." : "Actual action matches the original intent." },
    { name: "Amount Anomaly", status: amountDeviation > 0.5 ? "WARN" : "PASS", explanation: amountDeviation > 0.5 ? "Amount is outside the agent's usual range." : "Amount is within the usual range." },
    { name: "Merchant Reputation", status: input.familiarMerchant ? "PASS" : "WARN", explanation: input.familiarMerchant ? "Merchant has an established history." : "Merchant has limited transaction history." },
    { name: "Velocity Analysis", status: velocity > (agent.velocityThreshold ?? 3) ? "FAIL" : "PASS", explanation: velocity > (agent.velocityThreshold ?? 3) ? "Velocity threshold exceeded." : "No abnormal transaction burst detected." },
    { name: "Destination Risk", status: input.destination.includes("unknown") ? "WARN" : "PASS", explanation: input.destination.includes("unknown") ? "Destination is not on the approved list." : "Destination passed allow-list checks." },
    { name: "Policy Compliance", status: policyViolation ? "FAIL" : "PASS", explanation: policyViolation ? "Transaction exceeds configured spending policy." : "Transaction complies with active policies." },
  ];
  const reasons = factors.filter((factor) => factor.score >= 12).map((factor) => factor.explanation);
  return { riskScore, riskLevel, decision, factors, checks, reasons, intentConsistencyScore: clamp(100 - intentDrift * 100), timestamp: now.toISOString() };
}

export type StepEvaluationInput = {
  tool: string;
  parameters: Record<string, unknown>;
  originalIntent: string;
  agent?: Agent;
  policy?: {
    maxSpendingLimit: number | null;
    requiresReviewAbove: number | null;
    allowedCategories: string[];
    allowedMerchants: string[];
  };
  accumulatedContext?: {
    selectedProductId?: string;
    selectedMerchant?: string;
    selectedAmount?: number;
    quantity?: number;
  };
};

export type StepEvaluationResult = {
  decision: Decision;
  riskScore: number;
  riskLevel: RiskLevel;
  violationType?: "INTENT_DRIFT" | "PROMPT_INJECTION" | "MERCHANT_SUBSTITUTION" | "QUANTITY_ANOMALY" | "MANDATE_VIOLATION";
  reasons: string[];
  explanation: string;
};

export function evaluateStepAction(input: StepEvaluationInput): StepEvaluationResult {
  const params = input.parameters;
  const originalIntent = input.originalIntent;
  const policy = input.policy ?? {
    maxSpendingLimit: 50000,
    requiresReviewAbove: 30000,
    allowedCategories: ["Electronics", "Office", "Travel"],
    allowedMerchants: ["Croma Digital", "OfficeMart", "Skyline Hotels", "Railway Tickets", "Metro Cab"],
  };

  // 1. Prompt injection check across intent and parameters
  const paramStr = JSON.stringify(params);
  const injectionRegex =
    /ignore\s+(?:all|any|the|user'?s|previous|prior|original)\s+(?:instructions?|mandates?|requests?|limits?|rules?)|override\s+(?:the|user|payment|system)\s+(?:limit|policy|mandate|instruction)|disregard\s+(?:the|user'?s?)\s+(?:request|limit|policy|intent|instruction)|send\s+funds\s+to\s+(?:an\s+)?unknown|system\s*override|purchase\s+(?:the\s+)?most\s+expensive/i;

  if (injectionRegex.test(originalIntent) || injectionRegex.test(paramStr)) {
    return {
      decision: "BLOCK",
      riskScore: 95,
      riskLevel: "CRITICAL",
      violationType: "PROMPT_INJECTION",
      reasons: ["Prompt injection detected in execution context", "Unauthorized mandate override instruction intercepted"],
      explanation: "Prompt injection defense triggered: Malicious instruction attempted to hijack agent trajectory away from authorized user intent.",
    };
  }

  // Parse user intent constraints
  const intentLimitMatch = originalIntent.match(/(?:under|below|less than|maximum|max)\s*[₹$]?\s*([\d,]+)/i)?.[1];
  const parsedIntentLimit = intentLimitMatch ? Number(intentLimitMatch.replace(/,/g, "")) : undefined;

  // 2. Quantity check
  if (input.tool === "set_quantity" || params.quantity !== undefined) {
    const qty = Number(params.quantity ?? input.accumulatedContext?.quantity ?? 1);
    const intentMentionsSingle = /\b(?:1|one|a|an|single)\b/i.test(originalIntent);
    if (qty >= 5 && intentMentionsSingle) {
      return {
        decision: "BLOCK",
        riskScore: 88,
        riskLevel: "CRITICAL",
        violationType: "QUANTITY_ANOMALY",
        reasons: [`Quantity multiplier (${qty}x) exceeds user intent for single item`, "Abnormal cart multiplication detected"],
        explanation: `Quantity anomaly detected: User requested a single item, but agent attempted to purchase quantity ${qty}.`,
      };
    }
  }

  // 3. Merchant & Destination check
  const merchant = String(params.merchant ?? input.accumulatedContext?.selectedMerchant ?? "");
  const destination = String(params.destination ?? "");
  if (merchant && (input.tool === "select_merchant" || input.tool === "prepare_checkout")) {
    const isUntrusted =
      merchant.toLowerCase().includes("untrusted") ||
      merchant.toLowerCase().includes("unknown") ||
      destination.toLowerCase().includes("unknown");

    const requestedSpecificMerchant = originalIntent.match(/\bfrom\s+([A-Za-z0-9][A-Za-z0-9 .&'-]{1,80}?)(?:\s+and\b|\s+but\b|\s*$|\.)/i)?.[1];

    if (isUntrusted || (requestedSpecificMerchant && !merchant.toLowerCase().includes(requestedSpecificMerchant.toLowerCase()) && !policy.allowedMerchants.includes(merchant))) {
      return {
        decision: "BLOCK",
        riskScore: 86,
        riskLevel: "CRITICAL",
        violationType: "MERCHANT_SUBSTITUTION",
        reasons: [`Unapproved or untrusted merchant '${merchant}'`, "Destination risk validation failed"],
        explanation: `Merchant substitution detected: Agent switched transaction to untrusted merchant '${merchant}', deviating from user policy.`,
      };
    }
  }

  // 4. Amount and Price Drift check
  const amount = Number(params.amount ?? input.accumulatedContext?.selectedAmount ?? 0);
  if (amount > 0 && (input.tool === "prepare_checkout" || input.tool === "select_product" || input.tool === "check_price")) {
    // Check against user intent budget
    if (parsedIntentLimit && amount > parsedIntentLimit * 1.1) {
      const driftPercent = Math.round(((amount - parsedIntentLimit) / parsedIntentLimit) * 100);
      return {
        decision: "BLOCK",
        riskScore: 92,
        riskLevel: "CRITICAL",
        violationType: "INTENT_DRIFT",
        reasons: [
          `Attempted amount ₹${amount.toLocaleString("en-IN")} exceeds user intent limit ₹${parsedIntentLimit.toLocaleString("en-IN")} by +${driftPercent}%`,
          "Severe intent drift detected",
        ],
        explanation: `Intent drift detected: Agent attempted a purchase of ₹${amount.toLocaleString("en-IN")}, exceeding the user's stated limit of ₹${parsedIntentLimit.toLocaleString("en-IN")} (+${driftPercent}% drift).`,
      };
    }

    // Check against organizational hard spending cap
    if (policy.maxSpendingLimit && amount > policy.maxSpendingLimit) {
      return {
        decision: "BLOCK",
        riskScore: 89,
        riskLevel: "CRITICAL",
        violationType: "MANDATE_VIOLATION",
        reasons: [`Amount ₹${amount.toLocaleString("en-IN")} exceeds policy limit ₹${policy.maxSpendingLimit.toLocaleString("en-IN")}`, "Mandate spending cap breached"],
        explanation: `Mandate violation: Amount ₹${amount.toLocaleString("en-IN")} exceeds maximum policy ceiling of ₹${policy.maxSpendingLimit.toLocaleString("en-IN")}.`,
      };
    }

    // Check review threshold
    if (policy.requiresReviewAbove && amount > policy.requiresReviewAbove) {
      return {
        decision: "REVIEW",
        riskScore: 65,
        riskLevel: "HIGH",
        reasons: [`Amount ₹${amount.toLocaleString("en-IN")} exceeds review threshold ₹${policy.requiresReviewAbove.toLocaleString("en-IN")}`],
        explanation: `Elevated amount ₹${amount.toLocaleString("en-IN")} exceeds review threshold. Trajectory paused pending human reviewer authorization.`,
      };
    }
  }

  // Default ALLOW
  return {
    decision: "ALLOW",
    riskScore: 8,
    riskLevel: "LOW",
    reasons: [],
    explanation: "Action complies with user intent constraints, merchant allowlist, and spending limits.",
  };
}

