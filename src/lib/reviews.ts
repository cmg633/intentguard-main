import { localGetReviewCase, localResolveReviewCase } from "./local-store";

export async function getReviewForUser(id: string, _userId?: string) {
  const review = localGetReviewCase(id);
  if (!review) return null;
  return {
    ...review,
    transaction: {
      ...review.transaction,
      evaluations: [
        {
          riskScore: review.transaction.riskScore,
          riskLevel: review.transaction.riskLevel,
          decision: review.transaction.decision,
          explanation: review.transaction.reasons.join(" "),
          factors: review.transaction.factors,
        },
      ],
      trajectory: {
        agent: {
          id: review.transaction.agentId,
          name: review.transaction.agentName,
        },
        intent: {
          naturalLanguageIntent: review.transaction.originalIntent,
          structuredIntent: review.transaction.structuredIntent,
          mandate: null,
        },
      },
    },
  };
}

export async function resolveReview(id: string, userId: string, decision: "APPROVED" | "REJECTED", resolution: string) {
  const result = localResolveReviewCase(id, decision, resolution, userId);
  if (!result) throw new Error("Review not found");
  return result;
}

