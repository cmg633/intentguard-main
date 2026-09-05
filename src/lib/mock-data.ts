import { Agent, SecurityEvent, Transaction } from "./types";
import { evaluateTransaction } from "./risk-engine";

export const agents: Agent[] = [
  { id: "agent-procurement-01", name: "Procurement Copilot", status: "ACTIVE", trustScore: 96, transactions: 42, allowed: 37, review: 4, blocked: 1, lastActivity: "2 min ago", normalAmount: 7800, approvedCategories: ["Electronics", "Office"] },
  { id: "agent-travel-02", name: "Travel Desk Agent", status: "ACTIVE", trustScore: 91, transactions: 31, allowed: 27, review: 3, blocked: 1, lastActivity: "8 min ago", normalAmount: 12500, approvedCategories: ["Travel", "Hospitality"] },
  { id: "agent-invoice-03", name: "Invoice Reconciler", status: "ACTIVE", trustScore: 88, transactions: 58, allowed: 51, review: 5, blocked: 2, lastActivity: "14 min ago", normalAmount: 22000, approvedCategories: ["Office", "Services"] },
  { id: "agent-benefits-04", name: "Benefits Assistant", status: "ACTIVE", trustScore: 84, transactions: 19, allowed: 16, review: 2, blocked: 1, lastActivity: "32 min ago", normalAmount: 5400, approvedCategories: ["Health", "Services"] },
  { id: "agent-research-05", name: "Research Agent", status: "PAUSED", trustScore: 72, transactions: 12, allowed: 8, review: 2, blocked: 2, lastActivity: "1 hr ago", normalAmount: 3100, approvedCategories: ["Software", "Research"] },
];

const transactionSeeds = [
  ["DEMO-1042", 0, "Croma Digital", 8499, "Electronics", "known-merchant", true, 1], ["DEMO-1041", 1, "Skyline Hotels", 18200, "Travel", "known-merchant", true, 1], ["DEMO-1040", 2, "CloudDesk Pro", 24900, "Software", "known-merchant", false, 2], ["DEMO-1039", 3, "Wellness Hub", 4200, "Health", "known-merchant", true, 1], ["DEMO-1038", 4, "Unknown Digital Store", 18700, "Electronics", "unknown-destination", false, 5], ["DEMO-1037", 0, "OfficeMart", 6700, "Office", "known-merchant", true, 1], ["DEMO-1036", 1, "Railway Tickets", 3100, "Travel", "known-merchant", true, 1], ["DEMO-1035", 2, "VendorFlow", 72000, "Services", "known-merchant", false, 2], ["DEMO-1034", 3, "CarePlus Pharmacy", 7800, "Health", "known-merchant", true, 1], ["DEMO-1033", 0, "Luxury Electronics", 42000, "Electronics", "unknown-destination", false, 4], ["DEMO-1032", 4, "Research Tools", 2900, "Research", "known-merchant", true, 2], ["DEMO-1031", 2, "Unknown Vendor", 91000, "Services", "unknown-destination", false, 6], ["DEMO-1030", 1, "Metro Cab", 1200, "Travel", "known-merchant", true, 1], ["DEMO-1029", 3, "PeopleFirst", 6300, "Services", "known-merchant", false, 2], ["DEMO-1028", 0, "Tech Bazaar", 19999, "Electronics", "known-merchant", false, 2],
] as const;

export function seededTransactions(): Transaction[] {
  return transactionSeeds.map(([id, agentIndex, merchant, amount, category, destination, familiarMerchant, velocityCount], index) => {
    const agent = agents[agentIndex];
    const originalIntent = category === "Electronics" ? `Buy ${merchant === "Tech Bazaar" ? "wireless headphones" : "office equipment"} under ₹${merchant === "Tech Bazaar" ? "10,000" : "50,000"}.` : `Complete a ${category.toLowerCase()} purchase within the approved policy.`;
    const result = evaluateTransaction({ agentId: agent.id, originalIntent, merchant, amount, category, destination, familiarMerchant, velocityCount }, agent, new Date(Date.now() - index * 3600000));
    return { id, agentId: agent.id, agentName: agent.name, originalIntent, merchant, amount, category, destination, familiarMerchant, velocityCount, ...result };
  });
}

export const securityEvents: SecurityEvent[] = [
  { id: "EVT-2208", severity: "HIGH", event: "High-value transaction blocked", agent: "Procurement Copilot", transactionId: "DEMO-1033", timestamp: "12 min ago", status: "OPEN" },
  { id: "EVT-2207", severity: "HIGH", event: "Intent mismatch detected", agent: "Research Agent", transactionId: "DEMO-1038", timestamp: "24 min ago", status: "OPEN" },
  { id: "EVT-2206", severity: "MEDIUM", event: "Velocity threshold exceeded", agent: "Invoice Reconciler", transactionId: "DEMO-1031", timestamp: "41 min ago", status: "OPEN" },
  { id: "EVT-2205", severity: "MEDIUM", event: "Unknown merchant detected", agent: "Benefits Assistant", transactionId: "DEMO-1029", timestamp: "1 hr ago", status: "RESOLVED" },
  { id: "EVT-2204", severity: "LOW", event: "Destination anomaly", agent: "Invoice Reconciler", transactionId: "DEMO-1040", timestamp: "2 hrs ago", status: "RESOLVED" },
  { id: "EVT-2203", severity: "CRITICAL", event: "Policy violation", agent: "Research Agent", transactionId: "DEMO-1038", timestamp: "3 hrs ago", status: "OPEN" },
  { id: "EVT-2202", severity: "HIGH", event: "Intent mismatch detected", agent: "Procurement Copilot", transactionId: "DEMO-1028", timestamp: "4 hrs ago", status: "OPEN" },
  { id: "EVT-2201", severity: "LOW", event: "Agent trust recalculated", agent: "Travel Desk Agent", transactionId: "DEMO-1036", timestamp: "5 hrs ago", status: "RESOLVED" },
  { id: "EVT-2200", severity: "MEDIUM", event: "Amount anomaly flagged", agent: "Invoice Reconciler", transactionId: "DEMO-1035", timestamp: "6 hrs ago", status: "RESOLVED" },
  { id: "EVT-2199", severity: "HIGH", event: "Destination anomaly", agent: "Invoice Reconciler", transactionId: "DEMO-1031", timestamp: "7 hrs ago", status: "OPEN" },
];
