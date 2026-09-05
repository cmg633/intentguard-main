import { authorize } from "@/lib/route-auth";
import { localGetPolicy, localUpdatePolicy } from "@/lib/local-store";
import { errorResponse, successResponse } from "@/lib/http";
import { parseJson } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({ maxSpendingLimit: z.number().positive().max(100_000_000).nullable(), allowedCategories: z.array(z.string().trim().min(1).max(100)).max(100), allowedMerchants: z.array(z.string().trim().min(1).max(240)).max(100), requiresReviewAbove: z.number().positive().max(100_000_000).nullable(), velocityThreshold: z.number().int().min(1).max(100), riskThreshold: z.number().int().min(1).max(100), paymentMode: z.literal("TEST") });

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const policy = localGetPolicy();
  return successResponse(request, { policy });
}

export async function PUT(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const input = parseJson(schema, await request.json());
    const policy = localUpdatePolicy(input, auth.session!.id);
    return successResponse(request, { policy }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse(request, "INVALID_JSON", "Request body must be valid JSON.", 400);
    return errorResponse(request, "POLICY_UPDATE_FAILED", error instanceof Error ? error.message : "Unable to update policy.", 400);
  }
}

