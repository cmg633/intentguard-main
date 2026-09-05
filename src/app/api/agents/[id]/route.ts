import { authorize } from "@/lib/route-auth";
import { localGetAgent, localUpdateAgent, localGetTransactions } from "@/lib/local-store";
import { errorResponse, successResponse } from "@/lib/http";
import { parseJson } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({ status: z.enum(["ACTIVE", "PAUSED"]) });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const agent = localGetAgent(id);
  if (!agent) return errorResponse(request, "AGENT_NOT_FOUND", "Agent not found.", 404);
  const transactions = localGetTransactions().filter((t) => t.agentId === id);
  return successResponse(request, {
    agent: {
      ...agent,
      trajectories: transactions.map((t) => ({
        id: `traj-${t.id}`,
        status: t.decision === "BLOCK" ? "BLOCKED" : "COMPLETED",
        startedAt: t.timestamp,
        transaction: t,
      })),
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  try {
    const input = parseJson(schema, await request.json());
    const agent = localUpdateAgent(id, { status: input.status });
    if (!agent) return errorResponse(request, "AGENT_NOT_FOUND", "Agent not found.", 404);
    return successResponse(request, { status: input.status, agent });
  } catch (error) {
    return errorResponse(request, "AGENT_UPDATE_FAILED", error instanceof Error ? error.message : "Unable to update agent.", 400);
  }
}

