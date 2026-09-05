import { authorize } from "@/lib/route-auth";
import { successResponse } from "@/lib/http";
import { getPersistentTransactions } from "@/lib/persistent-store";

export async function GET(request: Request) { const auth = await authorize(request); if (auth.response) return auth.response; return successResponse(request, { transactions: await getPersistentTransactions(auth.session!.id) }); }
