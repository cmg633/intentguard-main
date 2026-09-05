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
    return successResponse(request, { review: await resolveReview(id, auth.session!.id, "APPROVED", body.resolution ?? "Approved by reviewer.") });
  } catch (error) { return errorResponse(request, "REVIEW_APPROVAL_FAILED", error instanceof Error ? error.message : "Unable to approve review.", 400); }
}
