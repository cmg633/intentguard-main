import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { agents as seededAgentsList, seededTransactions, securityEvents as seededEventsList } from "./mock-data";
import type { Agent, Decision, RiskLevel, SecurityCheck, SecurityEvent, Transaction, TransactionInput } from "./types";

import type { ToolCall } from "./tools";

export interface StoredAuditRecord {
  id: string;
  sequence: number;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  previousHash: string;
  hash: string;
  timestamp: string;
}

export interface StoredReviewCase {
  id: string;
  transactionId: string;
  status: "OPEN" | "APPROVED" | "REJECTED";
  reason: string;
  resolution?: string;
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  transaction: Transaction;
}

export interface StoredPolicy {
  id: string;
  version: number;
  maxSpendingLimit: number | null;
  requiresReviewAbove: number | null;
  velocityThreshold: number;
  riskThreshold: number;
  allowedCategories: string[];
  allowedMerchants: string[];
  paymentMode: "TEST";
  updatedAt: string;
}

export interface StoreData {
  agents: Agent[];
  transactions: Transaction[];
  securityEvents: SecurityEvent[];
  reviewCases: StoredReviewCase[];
  policy: StoredPolicy;
  auditRecords: StoredAuditRecord[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "intentguard-store.json");

export function hashPayload(payload: unknown, previousHash: string): string {
  return createHash("sha256").update(JSON.stringify({ previousHash, payload })).digest("hex");
}

function initializeSeedData(): StoreData {
  const agents: Agent[] = JSON.parse(JSON.stringify(seededAgentsList));
  const rawTransactions = seededTransactions();

  let previousHash = "GENESIS";
  const auditRecords: StoredAuditRecord[] = [];
  const reviewCases: StoredReviewCase[] = [];

  const transactions: Transaction[] = rawTransactions.map((tx, index) => {
    const payload = {
      transactionId: tx.id,
      agentId: tx.agentId,
      merchant: tx.merchant,
      amount: tx.amount,
      category: tx.category,
      decision: tx.decision,
      riskScore: tx.riskScore,
      riskLevel: tx.riskLevel,
      reasons: tx.reasons,
      timestamp: tx.timestamp,
    };
    const currentHash = hashPayload(payload, previousHash);
    const storedAudit: StoredAuditRecord = {
      id: `AUDIT-${1000 + index}`,
      sequence: index + 1,
      entityType: "Transaction",
      entityId: tx.id,
      payload,
      previousHash,
      hash: currentHash,
      timestamp: tx.timestamp,
    };
    auditRecords.push(storedAudit);

    const enrichedTx: Transaction = {
      ...tx,
      previousHash,
      auditHash: currentHash,
      modelVersion: "intentguard-rules-1.0",
      mlScore: tx.riskScore > 30 ? tx.riskScore : null,
      policyScore: tx.factors.find((f) => f.factor === "Policy compliance")?.score ?? 0,
      anomalyScore: tx.factors.find((f) => f.factor === "Amount anomaly")?.score ?? 0,
    };

    if (tx.decision === "REVIEW") {
      reviewCases.push({
        id: `REV-${tx.id}`,
        transactionId: tx.id,
        status: "OPEN",
        reason: tx.reasons.join(" ") || "Transaction flagged for elevated risk review.",
        createdAt: tx.timestamp,
        transaction: enrichedTx,
      });
    }

    previousHash = currentHash;
    return enrichedTx;
  });

  const securityEvents: SecurityEvent[] = seededEventsList.map((evt) => ({ ...evt }));

  const policy: StoredPolicy = {
    id: "policy-v1",
    version: 1,
    maxSpendingLimit: 50000,
    requiresReviewAbove: 30000,
    velocityThreshold: 3,
    riskThreshold: 60,
    allowedCategories: ["Electronics", "Office", "Travel", "Hospitality", "Health", "Services", "Software", "Research"],
    allowedMerchants: ["Croma Digital", "OfficeMart", "Skyline Hotels", "Railway Tickets", "Metro Cab"],
    paymentMode: "TEST",
    updatedAt: new Date().toISOString(),
  };

  return {
    agents,
    transactions,
    securityEvents,
    reviewCases,
    policy,
    auditRecords,
  };
}

let inMemoryStore: StoreData | null = null;

export function getLocalStore(): StoreData {
  if (inMemoryStore) return inMemoryStore;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      inMemoryStore = JSON.parse(raw) as StoreData;
      return inMemoryStore;
    }
  } catch {
    // If file system reading fails, fallback gracefully to fresh seed
  }

  inMemoryStore = initializeSeedData();
  saveLocalStore(inMemoryStore);
  return inMemoryStore;
}

export function saveLocalStore(store: StoreData): void {
  inMemoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Retain in-memory copy if disk write fails
  }
}

// Agents API
export function localGetAgents(): Agent[] {
  return getLocalStore().agents;
}

export function localGetAgent(id: string): Agent | undefined {
  return getLocalStore().agents.find((a) => a.id === id);
}

export function localUpdateAgent(id: string, updates: Partial<Agent>): Agent | null {
  const store = getLocalStore();
  const index = store.agents.findIndex((a) => a.id === id);
  if (index === -1) return null;
  store.agents[index] = { ...store.agents[index], ...updates };
  saveLocalStore(store);
  return store.agents[index];
}

// Transactions API
export function localGetTransactions(): Transaction[] {
  return getLocalStore().transactions;
}

export function localGetTransaction(id: string): Transaction | undefined {
  return getLocalStore().transactions.find((t) => t.id === id);
}

export function localSaveEvaluatedTransaction(params: {
  input: TransactionInput;
  agentName: string;
  result: {
    riskScore: number;
    riskLevel: RiskLevel;
    decision: Decision;
    reasons: string[];
    factors: Transaction["factors"];
    checks: SecurityCheck[];
    intentConsistencyScore: number;
    timestamp: string;
  };
  actions?: ToolCall[];
  investigator?: unknown;
  modelVersion?: string;
  mlScore?: number | null;
  actorId?: string;
}): Transaction {
  const store = getLocalStore();
  const txId = `DEMO-${1043 + store.transactions.length}`;

  const lastAudit = store.auditRecords[store.auditRecords.length - 1];
  const previousHash = lastAudit?.hash ?? "GENESIS";

  const payload = {
    transactionId: txId,
    agentId: params.input.agentId,
    merchant: params.input.merchant,
    amount: params.input.amount,
    category: params.input.category,
    destination: params.input.destination,
    decision: params.result.decision,
    riskScore: params.result.riskScore,
    riskLevel: params.result.riskLevel,
    reasons: params.result.reasons,
    actionsCount: params.actions?.length ?? 1,
    timestamp: params.result.timestamp,
  };

  const currentHash = hashPayload(payload, previousHash);

  const newAudit: StoredAuditRecord = {
    id: `AUDIT-${1000 + store.auditRecords.length}`,
    sequence: store.auditRecords.length + 1,
    entityType: "Transaction",
    entityId: txId,
    payload,
    previousHash,
    hash: currentHash,
    timestamp: params.result.timestamp,
  };

  store.auditRecords.push(newAudit);

  const transaction: Transaction = {
    id: txId,
    agentId: params.input.agentId,
    agentName: params.agentName,
    originalIntent: params.input.originalIntent,
    merchant: params.input.merchant,
    amount: params.input.amount,
    currency: params.input.currency ?? "INR",
    category: params.input.category,
    destination: params.input.destination,
    familiarMerchant: params.input.familiarMerchant,
    velocityCount: params.input.velocityCount ?? 1,
    riskScore: params.result.riskScore,
    riskLevel: params.result.riskLevel,
    decision: params.result.decision,
    reasons: params.result.reasons,
    factors: params.result.factors,
    checks: params.result.checks,
    intentConsistencyScore: params.result.intentConsistencyScore,
    timestamp: params.result.timestamp,
    structuredIntent: {
      originalIntent: params.input.originalIntent,
      merchant: params.input.merchant,
      amount: params.input.amount,
      category: params.input.category,
    },
    modelVersion: params.modelVersion ?? "intentguard-rules-1.0",
    mlScore: params.mlScore ?? null,
    policyScore: params.result.factors.find((f) => f.factor === "Policy compliance")?.score ?? 0,
    anomalyScore: params.result.factors.find((f) => f.factor === "Amount anomaly")?.score ?? 0,
    investigator: params.investigator,
    auditHash: currentHash,
    previousHash,
  };

  // Prepend to visible transactions
  store.transactions.unshift(transaction);

  // Update agent stats
  const agentIndex = store.agents.findIndex((a) => a.id === params.input.agentId);
  if (agentIndex !== -1) {
    const ag = store.agents[agentIndex];
    ag.transactions += 1;
    if (params.result.decision === "ALLOW") ag.allowed += 1;
    if (params.result.decision === "REVIEW") ag.review += 1;
    if (params.result.decision === "BLOCK") ag.blocked += 1;
    ag.lastActivity = "just now";
  }

  // Create Security Event if flagged
  if (params.result.decision !== "ALLOW") {
    store.securityEvents.unshift({
      id: `EVT-${2209 + store.securityEvents.length}`,
      severity: params.result.riskLevel,
      event: params.result.decision === "BLOCK" ? "High-risk transaction blocked" : "Transaction sent for review",
      agent: params.agentName,
      transactionId: txId,
      timestamp: "just now",
      status: "OPEN",
    });
  }

  // Create Review Case if REVIEW
  if (params.result.decision === "REVIEW") {
    store.reviewCases.unshift({
      id: `REV-${txId}`,
      transactionId: txId,
      status: "OPEN",
      reason: params.result.reasons.join(" ") || "Elevated risk requires human review.",
      createdAt: params.result.timestamp,
      transaction,
    });
  }

  saveLocalStore(store);
  return transaction;
}

// Security Events API
export function localGetSecurityEvents(): SecurityEvent[] {
  return getLocalStore().securityEvents;
}

export function localGetSecurityEvent(id: string): SecurityEvent | undefined {
  return getLocalStore().securityEvents.find((e) => e.id === id);
}

export function localUpdateSecurityEvent(id: string, status: SecurityEvent["status"], reason: string, actorId: string): SecurityEvent | null {
  const store = getLocalStore();
  const event = store.securityEvents.find((e) => e.id === id);
  if (!event) return null;

  const previousStatus = event.status;
  event.status = status;

  // Append audit record for state transition
  const lastAudit = store.auditRecords[store.auditRecords.length - 1];
  const previousHash = lastAudit?.hash ?? "GENESIS";
  const payload = {
    type: "SECURITY_EVENT_TRANSITION",
    eventId: id,
    actorId,
    previousStatus,
    newStatus: status,
    reason,
    timestamp: new Date().toISOString(),
  };
  const currentHash = hashPayload(payload, previousHash);
  store.auditRecords.push({
    id: `AUDIT-${1000 + store.auditRecords.length}`,
    sequence: store.auditRecords.length + 1,
    entityType: "SecurityEvent",
    entityId: id,
    payload,
    previousHash,
    hash: currentHash,
    timestamp: new Date().toISOString(),
  });

  saveLocalStore(store);
  return event;
}

// Review Queue API
export function localGetReviewCases(): StoredReviewCase[] {
  return getLocalStore().reviewCases.filter((r) => r.status === "OPEN");
}

export function localGetReviewCase(id: string): StoredReviewCase | undefined {
  return getLocalStore().reviewCases.find((r) => r.id === id);
}

export function localResolveReviewCase(id: string, decision: "APPROVED" | "REJECTED", resolution: string, actorId: string): StoredReviewCase | null {
  const store = getLocalStore();
  const review = store.reviewCases.find((r) => r.id === id);
  if (!review) return null;
  if (review.status !== "OPEN") throw new Error("Review already resolved");

  review.status = decision;
  review.resolution = resolution;
  review.assignedTo = actorId;
  review.resolvedAt = new Date().toISOString();

  // Update associated transaction decision
  const tx = store.transactions.find((t) => t.id === review.transactionId);
  if (tx) {
    tx.decision = decision === "APPROVED" ? "ALLOW" : "BLOCK";
  }

  // Append audit record
  const lastAudit = store.auditRecords[store.auditRecords.length - 1];
  const previousHash = lastAudit?.hash ?? "GENESIS";
  const payload = {
    type: "REVIEW_RESOLUTION",
    reviewId: id,
    transactionId: review.transactionId,
    actorId,
    decision,
    resolution,
    timestamp: new Date().toISOString(),
  };
  const currentHash = hashPayload(payload, previousHash);
  store.auditRecords.push({
    id: `AUDIT-${1000 + store.auditRecords.length}`,
    sequence: store.auditRecords.length + 1,
    entityType: "ReviewCase",
    entityId: id,
    payload,
    previousHash,
    hash: currentHash,
    timestamp: new Date().toISOString(),
  });

  saveLocalStore(store);
  return review;
}

// Policy API
export function localGetPolicy(): StoredPolicy {
  return getLocalStore().policy;
}

export function localUpdatePolicy(updates: Partial<StoredPolicy>, actorId: string): StoredPolicy {
  const store = getLocalStore();
  const current = store.policy;
  const updated: StoredPolicy = {
    ...current,
    ...updates,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  };
  store.policy = updated;

  // Append audit record
  const lastAudit = store.auditRecords[store.auditRecords.length - 1];
  const previousHash = lastAudit?.hash ?? "GENESIS";
  const payload = {
    type: "POLICY_CHANGED",
    actorId,
    version: updated.version,
    policy: updated,
    timestamp: updated.updatedAt,
  };
  const currentHash = hashPayload(payload, previousHash);
  store.auditRecords.push({
    id: `AUDIT-${1000 + store.auditRecords.length}`,
    sequence: store.auditRecords.length + 1,
    entityType: "Policy",
    entityId: updated.id,
    payload,
    previousHash,
    hash: currentHash,
    timestamp: updated.updatedAt,
  });

  saveLocalStore(store);
  return updated;
}

// Audit Records API & Verifier
export function localGetAuditRecords(): StoredAuditRecord[] {
  return [...getLocalStore().auditRecords].reverse();
}

export function localVerifyAuditChain(): {
  valid: boolean;
  recordsChecked: number;
  firstInvalidRecord: string | null;
  reason: string | null;
} {
  const records = getLocalStore().auditRecords;
  let previousHash = "GENESIS";

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.previousHash !== previousHash) {
      return {
        valid: false,
        recordsChecked: i,
        firstInvalidRecord: record.id,
        reason: `Previous hash mismatch at record ${record.id}: expected ${previousHash}, found ${record.previousHash}`,
      };
    }
    const calculatedHash = hashPayload(record.payload, record.previousHash);
    if (record.hash !== calculatedHash) {
      return {
        valid: false,
        recordsChecked: i,
        firstInvalidRecord: record.id,
        reason: `Payload hash mismatch at record ${record.id}: record was tampered`,
      };
    }
    previousHash = record.hash;
  }

  return {
    valid: true,
    recordsChecked: records.length,
    firstInvalidRecord: null,
    reason: null,
  };
}

// Stats API
export function localGetStats(): Record<string, number | string> {
  const store = getLocalStore();
  const txs = store.transactions;
  const agents = store.agents;
  const events = store.securityEvents;

  const total = txs.length;
  const allowed = txs.filter((t) => t.decision === "ALLOW").length;
  const review = txs.filter((t) => t.decision === "REVIEW").length;
  const blocked = txs.filter((t) => t.decision === "BLOCK").length;
  const activeAgents = agents.filter((a) => a.status === "ACTIVE").length;
  const threats = events.filter((e) => e.severity === "HIGH" || e.severity === "CRITICAL").length;
  const averageRisk = total ? Math.round(txs.reduce((sum, t) => sum + t.riskScore, 0) / total) : 0;

  return {
    total,
    allowed,
    review,
    blocked,
    activeAgents,
    threats,
    averageRisk,
    protectionStatus: "ACTIVE",
  };
}
