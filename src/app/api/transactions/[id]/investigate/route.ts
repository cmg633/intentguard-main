import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";
import { getPersistentTransaction } from "@/lib/persistent-store";
import { investigate } from "@/lib/investigator";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const transaction = await getPersistentTransaction(id, auth.session!.id);
  if (!transaction) return errorResponse(request, "TRANSACTION_NOT_FOUND", "Transaction not found.", 404);
  const investigation = await investigate(transaction, true);
  return successResponse(request, { investigation });
}
