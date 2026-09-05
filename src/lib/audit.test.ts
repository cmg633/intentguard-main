import { describe, expect, it } from "vitest";
import { auditHash, validateAuditChain } from "./store";
import { AuditRecord } from "./types";

const record = (previousHash: string, transactionId: string, riskScore: number, timestamp: string): AuditRecord => { const base = { transactionId, timestamp, decision: "ALLOW" as const, riskScore, riskLevel: "LOW" as const, checks: [], reasons: [], engineVersion: "test", previousHash }; return { ...base, currentHash: auditHash(base) }; };

describe("audit hash chain", () => {
  it("validates linked records", () => { const first = record("GENESIS", "TEST-1", 5, "2026-01-01T00:00:00.000Z"); const second = record(first.currentHash, "TEST-2", 8, "2026-01-01T00:01:00.000Z"); expect(validateAuditChain([second, first])).toBe(true); });
  it("detects a modified previous audit record", () => { const first = record("GENESIS", "TEST-1", 5, "2026-01-01T00:00:00.000Z"); const second = record(first.currentHash, "TEST-2", 8, "2026-01-01T00:01:00.000Z"); first.riskScore = 99; expect(validateAuditChain([second, first])).toBe(false); });
  it("detects a broken previous hash", () => { const first = record("GENESIS", "TEST-1", 5, "2026-01-01T00:00:00.000Z"); const second = record("BROKEN", "TEST-2", 8, "2026-01-01T00:01:00.000Z"); expect(validateAuditChain([second, first])).toBe(false); });
  it("detects a modified decision even when the link remains unchanged", () => { const first = record("GENESIS", "TEST-1", 5, "2026-01-01T00:00:00.000Z"); const second = record(first.currentHash, "TEST-2", 8, "2026-01-01T00:01:00.000Z"); second.decision = "BLOCK"; expect(validateAuditChain([second, first])).toBe(false); });
});