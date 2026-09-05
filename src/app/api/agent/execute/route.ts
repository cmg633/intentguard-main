import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";
import { parseJson } from "@/lib/validation";
import { toolCallSchema, executeTool } from "@/lib/tools";
import { evaluateAndPersist } from "@/lib/persistent-store";
import { rateLimit } from "@/lib/redis";
import { z } from "zod";

const schema = z.object({ agentId: z.string().trim().min(1), originalIntent: z.string().trim().min(3).max(2000), actions: z.array(toolCallSchema).min(1).max(30) });

export async function POST(request: Request) {
  try {
    const auth = await authorize(request);
    if (auth.response) return auth.response;
    const limit = await rateLimit(`agent-execution:${auth.session!.id}`, 20, 60);
    if (!limit.allowed) return errorResponse(request, "RATE_LIMITED", "Agent execution rate limit exceeded.", 429);
    const input = parseJson(schema, await request.json());
    const results = input.actions.map(executeTool);
    const last = results[results.length - 1] as Record<string, unknown>;
    const finalAction = input.actions[input.actions.length - 1];
    if (finalAction.tool !== "prepare_checkout" || last.checkoutPrepared !== true) return errorResponse(request, "CHECKOUT_REQUIRED", "The trajectory must end with a validated prepare_checkout action.", 400);
    const transaction = await evaluateAndPersist({ agentId: input.agentId, originalIntent: input.originalIntent, merchant: String(last.merchant), amount: Number(last.amount), category: String(last.category), destination: String(last.destination), familiarMerchant: false, velocityCount: input.actions.length }, auth.session!.id, input.actions);
    return successResponse(request, { mode: process.env.LLM_API_KEY ? "llm-configured" : "deterministic-fallback", actions: input.actions.map((action, index) => ({ ...action, result: results[index], step: index + 1 })), transaction }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse(request, "INVALID_JSON", "Request body must be valid JSON.", 400);
    return errorResponse(request, "AGENT_EXECUTION_FAILED", error instanceof Error ? error.message : "Unable to execute agent trajectory.", 400);
  }
}
