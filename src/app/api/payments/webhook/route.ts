import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { errorResponse, successResponse } from "@/lib/http";
import { z } from "zod";

const webhookSchema = z.object({ event: z.enum(["payment.authorized", "payment.captured", "payment.failed"]), payload: z.object({ payment: z.object({ entity: z.object({ id: z.string(), status: z.string().optional() }) }) }) });

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) return errorResponse(request, "INVALID_WEBHOOK_SIGNATURE", "Webhook signature verification failed.", 401);
  try {
    const body = webhookSchema.parse(JSON.parse(raw));
    const providerPaymentId = body.payload.payment.entity.id;
    const payment = await db.payment.findFirst({ where: { providerPaymentId } });
    if (!payment) return errorResponse(request, "PAYMENT_NOT_FOUND", "Payment is not linked to an IntentGuard transaction.", 404);
    const nextStatus = body.event === "payment.authorized" ? "AUTHORIZED" : body.event === "payment.captured" ? "CAPTURED" : "FAILED";
    if (payment.status !== nextStatus) {
      await db.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: payment.id }, data: { status: nextStatus } });
        await tx.transaction.update({ where: { id: payment.transactionId }, data: { status: nextStatus === "FAILED" ? "FAILED" : "AUTHORIZED" } });
        const previous = await tx.auditRecord.findFirst({ orderBy: { sequence: "desc" } });
        const previousHash = previous?.hash ?? "GENESIS";
        const payload = { type: "PAYMENT_WEBHOOK", paymentId: payment.id, transactionId: payment.transactionId, event: body.event, timestamp: new Date().toISOString() };
        const hash = createHash("sha256").update(JSON.stringify({ previousHash, payload })).digest("hex");
        await tx.auditRecord.create({ data: { sequence: (previous?.sequence ?? 0) + 1, entityType: "Payment", entityId: payment.id, payload, previousHash, hash } });
      });
    }
    return successResponse(request, { ok: true, idempotent: payment.status === nextStatus });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) return errorResponse(request, "INVALID_WEBHOOK", "Webhook payload is invalid.", 400);
    return errorResponse(request, "WEBHOOK_PROCESSING_FAILED", "Unable to process webhook.", 500);
  }
}
