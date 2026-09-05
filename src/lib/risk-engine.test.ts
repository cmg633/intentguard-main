import { describe, expect, it } from "vitest";
import { agents } from "./mock-data";
import { evaluateTransaction } from "./risk-engine";

const agent = agents[0];
const base = { agentId: agent.id, originalIntent: "Buy wireless headphones under ₹10,000.", merchant: "Croma Digital", amount: 8499, category: "Electronics", destination: "known-merchant", familiarMerchant: true, velocityCount: 1 };

describe("IntentGuard risk engine", () => {
  it("allows a safe transaction", () => expect(evaluateTransaction(base, agent).decision).toBe("ALLOW"));
  it("flags amount anomaly and intent drift", () => { const result = evaluateTransaction({ ...base, amount: 19999 }, agent); expect(result.factors.find((factor) => factor.factor === "Amount anomaly")?.score).toBeGreaterThan(0); expect(result.intentConsistencyScore).toBeLessThan(100); });
  it("detects velocity anomaly", () => expect(evaluateTransaction({ ...base, velocityCount: 6 }, agent).checks.find((check) => check.name === "Velocity Analysis")?.status).toBe("FAIL"));
  it("blocks critical behavior", () => expect(evaluateTransaction({ ...base, amount: 250000, merchant: "Unknown Flash Vendor", destination: "unknown-destination", familiarMerchant: false, velocityCount: 8 }, agent).decision).toBe("BLOCK"));
});