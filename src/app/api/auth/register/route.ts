import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/http";
import { parseJson } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(240), password: z.string().min(12).max(200) });

export async function POST(request: Request) {
  try {
    const input = parseJson(schema, await request.json());
    const email = input.email.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return errorResponse(request, "EMAIL_IN_USE", "An account already exists for this email.", 409);
    const user = await db.user.create({ data: { name: input.name, email, passwordHash: await hash(input.password, 12) } });
    await createSession(user, user.role);
    return successResponse(request, { user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse(request, "INVALID_JSON", "Request body must be valid JSON.", 400);
    return errorResponse(request, "REGISTRATION_FAILED", error instanceof Error ? error.message : "Unable to create account.", 400);
  }
}
