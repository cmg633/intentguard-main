import { authorize } from "@/lib/route-auth";
import { localGetReviewCases } from "@/lib/local-store";
import { errorResponse, successResponse } from "@/lib/http";


export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const cases = localGetReviewCases();
  const reviews = cases.map((r) => ({
    id: r.id,
    transactionId: r.transactionId,
    reason: r.reason,
    createdAt: r.createdAt,
    status: r.status,
    transaction: {
      id: r.transaction.id,
      merchant: r.transaction.merchant,
      amount: r.transaction.amount,
      category: r.transaction.category,
      originalIntent: r.transaction.originalIntent,
      agentName: r.transaction.agentName,
      riskScore: r.transaction.riskScore,
      riskLevel: r.transaction.riskLevel,
      evaluations: [
        {
          riskScore: r.transaction.riskScore,
          riskLevel: r.transaction.riskLevel,
          decision: r.transaction.decision,
          explanation: r.transaction.reasons.join(" "),
        },
      ],
      factors: r.transaction.factors,
    },
  }));
  return successResponse(request, { reviews });
}


export async function POST(request: Request) {
  return errorResponse(request, "METHOD_NOT_ALLOWED", "Reviews are created by REVIEW evaluations.", 405);
}
