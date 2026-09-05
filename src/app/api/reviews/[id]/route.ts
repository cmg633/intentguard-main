import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";
import { getReviewForUser } from "@/lib/reviews";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const review = await getReviewForUser(id, auth.session!.id);
  if (!review) return errorResponse(request, "REVIEW_NOT_FOUND", "Review not found.", 404);
  return successResponse(request, { review });
}
