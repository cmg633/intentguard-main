import { describe, expect, it } from "vitest";
import { POST as evaluate } from "./transactions/evaluate/route";
import { GET as getTransaction } from "./transactions/[id]/route";
import { GET as getEvaluation } from "./evaluation/route";
import { localGetTransaction } from "@/lib/local-store";

const safePayload = {
  agentId: "agent-procurement-01",
  originalIntent: "Buy wireless headphones under ₹10,000.",
  merchant: "Croma Digital",
  amount: 8499,
  category: "Electronics",
  destination: "known-merchant",
  familiarMerchant: true,
  velocityCount: 1,
};

const request = (body: unknown) =>
  new Request("http://localhost/api/transactions/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("IntentGuard evaluation API", () => {
  it("persists a safe evaluation and returns its backend decision", async () => {
    const response = await evaluate(request(safePayload));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ decision: "ALLOW", riskLevel: "LOW" });
    expect(body).toHaveProperty("riskScore");
    expect(localGetTransaction(body.id)).toBeDefined();
  });

  it("derives unfamiliar merchant and velocity signals server-side", async () => {
    const response = await evaluate(
      request({
        ...safePayload,
        merchant: "Unapproved Flash Vendor",
        familiarMerchant: true,
        destination: "unknown-destination",
        velocityCount: 1,
      })
    );
    const body = await response.json();
    expect(["REVIEW", "BLOCK"]).toContain(body.decision);
    expect(body.factors.find((factor: { factor: string }) => factor.factor === "Merchant familiarity").score).toBeGreaterThan(2);
  });

  it("rejects malformed JSON and invalid numeric input", async () => {
    const malformed = await evaluate(
      new Request("http://localhost/api/transactions/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{bad json",
      })
    );
    expect(malformed.status).toBe(400);

    const invalid = await evaluate(request({ ...safePayload, amount: 0 }));
    expect(invalid.status).toBe(400);
  });

  it("rejects paused agents", async () => {
    const response = await evaluate(request({ ...safePayload, agentId: "agent-research-05" }));
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown transaction ID", async () => {
    const response = await getTransaction(
      new Request("http://localhost/api/transactions/UNKNOWN"),
      { params: Promise.resolve({ id: "UNKNOWN" }) }
    );
    expect(response.status).toBe(404);
  });

  it("returns calculated evaluation metrics", async () => {
    const body = await (await getEvaluation(new Request("http://localhost/api/evaluation"))).json();
    expect(body.dataset).toMatchObject({ type: "synthetic", test_samples: 16 });
    expect(body.metrics).toHaveProperty("precision");
    expect(body.confusion_matrix).toMatchObject({ true_positive: 9, true_negative: 6, false_positive: 0, false_negative: 1 });
  });
});

