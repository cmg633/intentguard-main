import { errorResponse, successResponse } from "@/lib/http";
import { parseJson } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().email().max(240), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  try {
    const input = parseJson(schema, await request.json());
    // In demo mode, accept the demo credentials seamlessly
    if (input.email.toLowerCase() === "demo@intentguard.local" && input.password === "intentguard-demo") {
      return successResponse(request, {
        user: { id: "demo-user", name: "Security Commander", email: "demo@intentguard.local", role: "ADMIN" },
      });
    }
    return errorResponse(request, "INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse(request, "INVALID_JSON", "Request body must be valid JSON.", 400);
    return errorResponse(request, "LOGIN_FAILED", error instanceof Error ? error.message : "Unable to sign in.", 400);
  }
}

