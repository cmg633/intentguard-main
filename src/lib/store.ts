import { createHash } from "crypto";
import { agents, seededTransactions, securityEvents } from "./mock-data";
import { AuditRecord, SecurityEvent, Transaction, TransactionInput } from "./types";
import { evaluateTransaction } from "./risk-engine";

const transactions: Transaction[] = seededTransactions();
const events: SecurityEvent[] = [...securityEvents];
const audits: AuditRecord[] = [];

export function getTransactions() { return transactions; }
export function getAgents() { return agents; }
export function getEvents() { return events; }
export function getAudits() { return audits; }
export function getTransaction(id: string) { return transactions.find((transaction) => transaction.id === id); }

export function auditHash(record: Omit<AuditRecord, "currentHash">) {
  return createHash("sha256").update(JSON.stringify({ previousHash: record.previousHash, transactionId: record.transactionId, timestamp: record.timestamp, decision: record.decision, riskScore: record.riskScore, riskLevel: record.riskLevel, checks: record.checks, reasons: record.reasons, engineVersion: record.engineVersion })).digest("hex").slice(0, 16);
}

export function validateAuditChain(records: AuditRecord[] = audits) {
  let expectedPreviousHash = "GENESIS";
  for (const record of [...records].reverse()) {
    if (record.previousHash !== expectedPreviousHash || record.currentHash !== auditHash(record)) return false;
    expectedPreviousHash = record.currentHash;
  }
  return true;
}

export function evaluateAndStore(input: TransactionInput) {
  const agent = agents.find((item) => item.id === input.agentId);
  if (!agent) throw new Error("Unknown agent");
  const result = evaluateTransaction(input, agent);
  const id = `DEMO-${1043 + transactions.length}`;
  const transaction: Transaction = { id, agentName: agent.name, ...input, ...result };
  transactions.unshift(transaction);
  if (result.decision !== "ALLOW") events.unshift({ id: `EVT-${2209 + events.length}`, severity: result.riskLevel, event: result.decision === "BLOCK" ? "High-risk transaction blocked" : "Transaction sent for review", agent: agent.name, transactionId: id, timestamp: "just now", status: "OPEN" });
  const previousHash = audits[0]?.currentHash ?? "GENESIS";
  agent.transactions += 1;
  agent.allowed += result.decision === "ALLOW" ? 1 : 0;
  agent.review += result.decision === "REVIEW" ? 1 : 0;
  agent.blocked += result.decision === "BLOCK" ? 1 : 0;
  agent.lastActivity = "just now";
  const audit = { transactionId: id, timestamp: result.timestamp, decision: result.decision, riskScore: result.riskScore, riskLevel: result.riskLevel, checks: result.checks, reasons: result.reasons, engineVersion: "intentguard-rules-1.0", previousHash };
  audits.unshift({ ...audit, currentHash: auditHash(audit) });
  return transaction;
}
