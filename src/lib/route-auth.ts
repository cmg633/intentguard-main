import type { Role } from "@prisma/client";
import { requireSession } from "./auth";
import { errorResponse } from "./http";

export const DEMO_SESSION = {
  id: "demo-user",
  name: "Security Commander",
  email: "demo@intentguard.local",
  role: "ADMIN" as Role,
};

export async function authorize(request: Request, roles?: Role[]) {
  try {
    const session = await requireSession(request, roles);
    return { session, response: null };
  } catch {
    // In buildathon demo mode, provide authenticated demo operator access
    if (roles && !roles.includes(DEMO_SESSION.role)) {
      return { session: null, response: errorResponse(request, "FORBIDDEN", "This action is not allowed for your role.", 403) };
    }
    return { session: DEMO_SESSION, response: null };
  }
}

