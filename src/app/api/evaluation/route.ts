import { runHeldOutEvaluation } from "@/lib/evaluation";
import { authorize } from "@/lib/route-auth";
import { successResponse } from "@/lib/http";

export async function GET(request: Request = new Request("http://localhost/api/evaluation")) { const auth = await authorize(request); if (auth.response) return auth.response; return successResponse(request, runHeldOutEvaluation()); }