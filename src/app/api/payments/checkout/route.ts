import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const configured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.PAYMENT_MODE === "TEST");
  return successResponse(request, { configured, mode: "TEST", message: configured ? "Razorpay TEST checkout is configured." : "Razorpay TEST checkout not configured." });
}

export async function POST(request: Request) {
  return errorResponse(request, "USE_ORDER_ENDPOINT", "Create a server-side order before opening TEST checkout.", 405);
}
