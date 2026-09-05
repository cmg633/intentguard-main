import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentOrder = { id: string; amount: number; currency: string; status: string };

export async function createTestOrder(input: { amount: number; currency: string; receipt: string }): Promise<PaymentOrder> {
  if (process.env.PAYMENT_MODE !== "TEST") throw new Error("PAYMENT_MODE must be TEST");
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new Error("RAZORPAY_TEST_NOT_CONFIGURED");
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(input.amount * 100), currency: input.currency, receipt: input.receipt, notes: { environment: "TEST" } }) });
  if (!response.ok) throw new Error(`RAZORPAY_ORDER_FAILED_${response.status}`);
  return response.json() as Promise<PaymentOrder>;
}

export function verifyWebhookSignature(payload: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
