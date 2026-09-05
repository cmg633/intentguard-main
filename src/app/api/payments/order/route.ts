import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";
import { localGetTransaction } from "@/lib/local-store";
import { createTestOrder } from "@/lib/payments/razorpay";
import { parseJson } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({ transactionId: z.string().trim().min(1) });

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const { transactionId } = parseJson(schema, await request.json());
    const transaction = localGetTransaction(transactionId);
    if (!transaction) return errorResponse(request, "TRANSACTION_NOT_FOUND", "Transaction not found.", 404);
    if (transaction.decision !== "ALLOW") return errorResponse(request, "PAYMENT_NOT_ALLOWED", "Only evaluated ALLOW transactions can enter TEST checkout.", 409);
    const order = await createTestOrder({ amount: Number(transaction.amount), currency: transaction.currency ?? "INR", receipt: transaction.id });
    return successResponse(request, { mode: "TEST", order }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse(request, "INVALID_JSON", "Request body must be valid JSON.", 400);
    if (error instanceof Error && error.message === "RAZORPAY_TEST_NOT_CONFIGURED") return errorResponse(request, "RAZORPAY_TEST_NOT_CONFIGURED", "Razorpay TEST mode is not configured.", 503);
    return errorResponse(request, "PAYMENT_ORDER_FAILED", error instanceof Error ? error.message : "Unable to create TEST order.", 400);
  }
}

