import { PrismaClient, Role, AgentStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await hash("intentguard-demo", 12);
  const user = await db.user.upsert({
    where: { email: "demo@intentguard.local" },
    update: { name: "IntentGuard Demo", passwordHash, role: Role.ADMIN },
    create: { name: "IntentGuard Demo", email: "demo@intentguard.local", passwordHash, role: Role.ADMIN },
  });

  const agents = [
    { id: "agent-procurement-01", name: "Procurement Copilot", trustScore: 96, normalAmount: 7800, categories: ["Electronics", "Office"] },
    { id: "agent-travel-02", name: "Travel Desk Agent", trustScore: 91, normalAmount: 12500, categories: ["Travel", "Hospitality"] },
    { id: "agent-invoice-03", name: "Invoice Reconciler", trustScore: 88, normalAmount: 22000, categories: ["Office", "Services"] },
    { id: "agent-benefits-04", name: "Benefits Assistant", trustScore: 84, normalAmount: 5400, categories: ["Health", "Services"] },
    { id: "agent-research-05", name: "Research Agent", trustScore: 72, normalAmount: 3100, categories: ["Software", "Research"], status: AgentStatus.PAUSED },
  ];

  for (const item of agents) {
    await db.agent.upsert({
      where: { id: item.id },
      update: { name: item.name, trustScore: item.trustScore, status: item.status ?? AgentStatus.ACTIVE },
      create: { id: item.id, userId: user.id, name: item.name, trustScore: item.trustScore, status: item.status ?? AgentStatus.ACTIVE },
    });
  }

  await db.policy.upsert({
    where: { userId_version: { userId: user.id, version: 1 } },
    update: {},
    create: { userId: user.id, version: 1, maxSpendingLimit: 50000, allowedCategories: ["Electronics", "Office", "Travel", "Hospitality", "Health", "Services", "Software", "Research"], allowedMerchants: ["Croma Digital", "OfficeMart", "Skyline Hotels", "Railway Tickets", "Metro Cab"], requiresReviewAbove: 30000, velocityThreshold: 3, riskThreshold: 60, paymentMode: "TEST" },
  });

  console.log(`Seeded ${user.email} and ${agents.length} agents.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
