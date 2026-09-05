import { authorize } from "@/lib/route-auth";
import { localGetSecurityEvent, localUpdateSecurityEvent } from "@/lib/local-store";
import { errorResponse, successResponse } from "@/lib/http";
import { parseJson } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({ status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]), reason: z.string().trim().min(3).max(500) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  try {
    const input = parseJson(schema, await request.json());
    const event = localGetSecurityEvent(id);
    if (!event) return errorResponse(request, "EVENT_NOT_FOUND", "Security event not found.", 404);
    const updated = localUpdateSecurityEvent(id, input.status, input.reason, auth.session!.id);
    return successResponse(request, { event: updated });
  } catch (error) { return errorResponse(request, "EVENT_UPDATE_FAILED", error instanceof Error ? error.message : "Unable to update security event.", 400); }
}

