export type Decision = "ALLOW" | "REVIEW" | "BLOCK";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type CheckStatus = "PASS" | "WARN" | "FAIL";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Agent = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  trustScore: number;
  transactions: number;
  allowed: number;
  review: number;
  blocked: number;
  lastActivity: string;
  normalAmount: number;
  approvedCategories: string[];
  maxSpendingLimit?: number;
  velocityThreshold?: number;
  requiresReviewAbove?: number;
};

export type TransactionInput = {
  agentId: string;
  originalIntent: string;
  merchant: string;
  amount: number;
  currency?: string;
  category: string;
  destination: string;
  familiarMerchant: boolean;
  velocityCount?: number;
  promptInjection?: boolean;
};

export type RiskFactor = {
  factor: string;
  score: number;
  severity: Severity;
  explanation: string;
};

export type SecurityCheck = {
  name: string;
  status: CheckStatus;
  explanation: string;
};

export type Transaction = TransactionInput & {
  id: string;
  agentName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  decision: Decision;
  reasons: string[];
  factors: RiskFactor[];
  checks: SecurityCheck[];
  intentConsistencyScore: number;
  timestamp: string;
  trajectoryId?: string;
  structuredIntent?: unknown;
  modelVersion?: string;
  mlScore?: number | null;
  policyScore?: number | null;
  anomalyScore?: number | null;
  investigator?: unknown;
  auditHash?: string;
  previousHash?: string;
};

export type SecurityEvent = {
  id: string;
  severity: Severity;
  event: string;
  agent: string;
  transactionId: string;
  timestamp: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
};

export type AuditRecord = {
  transactionId: string;
  timestamp: string;
  decision: Decision;
  riskScore: number;
  riskLevel: RiskLevel;
  checks: SecurityCheck[];
  reasons: string[];
  engineVersion: string;
  currentHash: string;
  previousHash: string;
};
