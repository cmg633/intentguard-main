import { TransactionInput } from "@/lib/types";
import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";
import { parseJson } from "@/lib/validation";
import { transactionEvaluationSchema } from "@/lib/validation";
import { evaluateAndPersist } from "@/lib/persistent-store";
import { rateLimit } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const auth = await authorize(request);
    if (auth.response) return auth.response;
    const limit = await rateLimit(`evaluation:${auth.session!.id}`, 60, 60);
    if (!limit.allowed) return errorResponse(request, "RATE_LIMITED", "Evaluation rate limit exceeded.", 429);
    const body = parseJson(transactionEvaluationSchema, await request.json());
    const transaction = await evaluateAndPersist(body as TransactionInput, auth.session!.id);
    return successResponse(request, transaction, 201);
  } catch (error) { const message = error instanceof Error ? error.message : "Unable to evaluate transaction"; return errorResponse(request, message === "Unknown agent" ? "AGENT_NOT_FOUND" : "EVALUATION_FAILED", message, message === "Unknown agent" ? 404 : 400); }
}
