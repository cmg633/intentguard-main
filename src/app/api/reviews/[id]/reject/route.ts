import { Role } from "@prisma/client";
import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";
import { resolveReview } from "@/lib/reviews";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request, [Role.ADMIN, Role.REVIEWER]);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  try {
    const body = await request.json().catch(() => ({})) as { resolution?: string };
    if (!body.resolution?.trim()) return errorResponse(request, "REASON_REQUIRED", "A rejection reason is required.", 400);
    return successResponse(request, { review: await resolveReview(id, auth.session!.id, "REJECTED", body.resolution.trim()) });
  } catch (error) { return errorResponse(request, "REVIEW_REJECTION_FAILED", error instanceof Error ? error.message : "Unable to reject review.", 400); }
}
