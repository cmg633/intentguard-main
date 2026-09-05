import { z } from "zod";

export const transactionEvaluationSchema = z.object({
  agentId: z.string().trim().min(1).max(120),
  originalIntent: z.string().trim().min(3).max(2000),
  merchant: z.string().trim().min(1).max(240),
  amount: z.number().finite().positive().max(100_000_000),
  currency: z.string().trim().length(3).toUpperCase().default("INR"),
  category: z.string().trim().min(1).max(100),
  destination: z.string().trim().min(1).max(240),
  familiarMerchant: z.boolean().optional(),
  velocityCount: z.number().int().min(1).max(100).optional(),
  trajectoryId: z.string().trim().min(1).max(120).optional(),
});

export type TransactionEvaluationRequest = z.infer<typeof transactionEvaluationSchema>;

export function parseJson<T>(schema: z.ZodType<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) throw new Error(result.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join(", "));
  return result.data;
}
