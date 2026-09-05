import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";
import { localGetTransaction } from "@/lib/local-store";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { parseJson } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({ transactionId: z.string().trim().min(1), orderId: z.string().trim().min(1), paymentId: z.string().trim().min(1), signature: z.string().trim().min(1) });

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const input = parseJson(schema, await request.json());
    const transaction = localGetTransaction(input.transactionId);
    if (!transaction) return errorResponse(request, "TRANSACTION_NOT_FOUND", "Transaction not found.", 404);
    if (!verifyPaymentSignature(input.orderId, input.paymentId, input.signature)) {
      return errorResponse(request, "INVALID_PAYMENT_SIGNATURE", "Payment signature verification failed.", 401);
    }
    return successResponse(request, { verified: true, paymentId: input.paymentId });
  } catch (error) {
    return errorResponse(request, "PAYMENT_VERIFICATION_FAILED", error instanceof Error ? error.message : "Unable to verify payment.", 400);
  }
}