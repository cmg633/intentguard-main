import { NextResponse } from "next/server";
import { authorize } from "@/lib/route-auth";
import { getPersistentTransaction } from "@/lib/persistent-store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize(_request); if (auth.response) return auth.response;
  const { id } = await context.params;
  const transaction = await getPersistentTransaction(id, auth.session!.id);
  if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  return NextResponse.json(transaction);
}