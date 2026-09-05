import { authorize } from "@/lib/route-auth";
import { successResponse } from "@/lib/http";
import { getPersistentAudits } from "@/lib/persistent-store";

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const audits = await getPersistentAudits(auth.session!.id);
  return successResponse(request, {
    audits: audits.map((audit) => ({
      id: audit.id,
      sequence: audit.sequence,
      entityType: audit.entityType,
      entityId: audit.entityId,
      transactionId: audit.entityId,
      timestamp: audit.timestamp,
      decision: (audit.payload?.decision as string) ?? "RECORD",
      riskScore: typeof audit.payload?.riskScore === "number" ? audit.payload.riskScore : 0,
      riskLevel: (audit.payload?.riskLevel as string) ?? "LOW",
      engineVersion: "intentguard-sha256-chain",
      currentHash: audit.hash,
      previousHash: audit.previousHash,
      payload: audit.payload,
    })),
  });
}

