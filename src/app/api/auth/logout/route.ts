import { destroySession } from "@/lib/auth";
import { successResponse } from "@/lib/http";

export async function POST(request: Request) {
  await destroySession();
  return successResponse(request, { ok: true });
}
