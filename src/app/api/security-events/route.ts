import { authorize } from "@/lib/route-auth";
import { successResponse } from "@/lib/http";
import { getPersistentEvents } from "@/lib/persistent-store";

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const events = await getPersistentEvents(auth.session!.id);
  return successResponse(request, {
    events: events.map((event) => ({
      id: event.id,
      severity: event.severity,
      event: event.event,
      agent: event.agent,
      transactionId: event.transactionId,
      timestamp: event.timestamp,
      status: event.status,
    })),
  });
}

