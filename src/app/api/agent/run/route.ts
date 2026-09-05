import { authorize } from "@/lib/route-auth";
import { errorResponse, successResponse } from "@/lib/http";
import { parseJson } from "@/lib/validation";
import { runAgentSchema, runAutonomousAgentSession } from "@/lib/agent-loop";

export async function POST(request: Request) {
  try {
    const auth = await authorize(request);
    if (auth.response) return auth.response;

    const input = parseJson(runAgentSchema, await request.json());
    const result = await runAutonomousAgentSession(input);

    return successResponse(request, result, 200);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(request, "INVALID_JSON", "Request body must be valid JSON.", 400);
    }
    return errorResponse(
      request,
      "AGENT_SESSION_FAILED",
      error instanceof Error ? error.message : "Autonomous agent run failed.",
      400
    );
  }
}
