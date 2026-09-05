import { getSession } from "@/lib/auth";
import { successResponse } from "@/lib/http";

export async function GET(request: Request) {
  return successResponse(request, { user: await getSession() });
}
