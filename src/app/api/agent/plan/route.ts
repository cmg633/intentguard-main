import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";
import { parseJson } from "@/lib/validation";
import { getLLMProvider } from "@/lib/llm";
import { parseIntent } from "@/lib/intent-parser";
import { toolCallSchema, type ToolCall } from "@/lib/tools";
import { z } from "zod";

const schema = z.object({ originalIntent: z.string().trim().min(3).max(2000) });

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const { originalIntent } = parseJson(schema, await request.json());
    const structuredIntent = parseIntent(originalIntent);
    let mode = "deterministic-fallback";
    let actions: ToolCall[];
    try {
      actions = (await getLLMProvider().generatePlan(structuredIntent)).map((action) => toolCallSchema.parse(action));
      mode = "llm";
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "LLM_PROVIDER_UNAVAILABLE") throw error;
      actions = [{ tool: "search_catalog", parameters: { category: structuredIntent.category ?? "general" } }, { tool: "get_product", parameters: { productId: "prod-headphones-01" } }, { tool: "check_price", parameters: { productId: "prod-headphones-01" } }, { tool: "prepare_checkout", parameters: { productId: "prod-headphones-01", merchant: "Croma Digital", amount: structuredIntent.maxAmount && structuredIntent.maxAmount < 8499 ? structuredIntent.maxAmount : 8499, category: structuredIntent.category ?? "Electronics", destination: "approved-merchant" } }];
    }
    return successResponse(request, { mode, structuredIntent, actions });
  } catch (error) { return errorResponse(request, "AGENT_PLAN_FAILED", error instanceof Error ? error.message : "Unable to plan agent actions.", 400); }
}