import { authorize } from "@/lib/route-auth";
import { successResponse } from "@/lib/http";
import { getPersistentAgents } from "@/lib/persistent-store";
export async function GET(request: Request) { const auth = await authorize(request); if (auth.response) return auth.response; return successResponse(request, { agents: await getPersistentAgents(auth.session!.id) }); }
