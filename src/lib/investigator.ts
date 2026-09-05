import { z } from "zod";
import { getLLMProvider } from "./llm";

export const investigationSchema = z.object({ riskSummary: z.string().min(1).max(2000), suspiciousSteps: z.array(z.string().max(500)).max(30), violatedPolicies: z.array(z.string().max(300)).max(30), injectionIndicators: z.array(z.string().max(300)).max(30), explanation: z.string().min(1).max(3000), recommendation: z.enum(["ALLOW", "REVIEW", "BLOCK"]) });
export type Investigation = z.infer<typeof investigationSchema> & { invoked: boolean; provider: string; model: string; latencyMs: number; error?: string };

export async function investigate(context: unknown, shouldInvoke: boolean): Promise<Investigation> {
  if (!shouldInvoke) return { riskSummary: "No investigator required for this low-risk trajectory.", suspiciousSteps: [], violatedPolicies: [], injectionIndicators: [], explanation: "Deterministic checks did not require secondary investigation.", recommendation: "ALLOW", invoked: false, provider: "none", model: "none", latencyMs: 0 };
  const started = performance.now();
  try {
    const raw = await getLLMProvider().analyzeRisk(context);
    const normalized = investigationSchema.parse({ riskSummary: raw.explanation, suspiciousSteps: [], violatedPolicies: [], injectionIndicators: raw.indicators, explanation: raw.explanation, recommendation: "REVIEW" });
    return { ...normalized, invoked: true, provider: process.env.LLM_PROVIDER ?? "none", model: process.env.LLM_MODEL ?? "none", latencyMs: performance.now() - started };
  } catch (error) {
    return { riskSummary: "Deterministic investigation retained control.", suspiciousSteps: [], violatedPolicies: [], injectionIndicators: [], explanation: "LLM investigator unavailable; deterministic evidence remains authoritative.", recommendation: "REVIEW", invoked: false, provider: process.env.LLM_PROVIDER ?? "none", model: process.env.LLM_MODEL ?? "none", latencyMs: performance.now() - started, error: error instanceof Error ? error.message : "Investigator failed" };
  }
}
