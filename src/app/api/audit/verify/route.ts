import { authorize } from "@/lib/route-auth";
import { localVerifyAuditChain } from "@/lib/local-store";
import { successResponse } from "@/lib/http";

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const result = localVerifyAuditChain();
  return successResponse(request, result);
}

