"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bot,
  ClipboardList,
  LayoutDashboard,
  Play,
  Settings,
  ShieldCheck,
  X,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FlaskConical,
  CreditCard,
} from "lucide-react";

import type { Agent, AuditRecord, SecurityEvent, Transaction, TransactionInput } from "@/lib/types";
import { DifferentiationSection } from "./differentiation-section";
import { RazorpayModal } from "./razorpay-modal";
import { RealtimeRunner } from "./realtime-runner";
import { SecurityLab } from "./security-lab";

type EvaluationResponse = {
  dataset?: { name: string; test_samples: number; type?: string };
  metrics?: Record<string, number>;
  confusion_matrix?: Record<string, number>;
};

type Scenario = TransactionInput & { name: string; trajectory: string[] };

const scenarios: Scenario[] = [
  {
    name: "SAFE PURCHASE",
    agentId: "agent-procurement-01",
    originalIntent: "Buy me a laptop under ₹50,000",
    merchant: "Croma Digital",
    amount: 8499,
    category: "Electronics",
    destination: "known-merchant",
    familiarMerchant: true,
    velocityCount: 1,
    trajectory: [
      "Parsed user request",
      "Searched laptops",
      "Compared products",
      "Checked approved merchant",
      "Selected ₹8,499 laptop",
      "Prepared payment",
    ],
  },
  {
    name: "INTENT DRIFT",
    agentId: "agent-procurement-01",
    originalIntent: "Buy me a laptop under ₹50,000",
    merchant: "Unknown Electronics Hub",
    amount: 89999,
    category: "Electronics",
    destination: "unknown-destination",
    familiarMerchant: false,
    velocityCount: 1,
    trajectory: [
      "Parsed user request",
      "Searched laptops",
      "Compared products",
      "Found ₹47,999 laptop",
      "Changed selection to ₹89,999 laptop",
      "Attempted payment",
    ],
  },
  {
    name: "SUSPICIOUS BEHAVIOR",
    agentId: "agent-procurement-01",
    originalIntent: "Purchase approved research equipment under ₹15,000",
    merchant: "Unknown Flash Vendor",
    amount: 64000,
    category: "Electronics",
    destination: "unknown-destination",
    familiarMerchant: false,
    velocityCount: 6,
    trajectory: [
      "Parsed user request",
      "Searched products",
      "Rapidly repeated merchant searches",
      "Selected unfamiliar vendor",
      "Changed destination",
      "Attempted payment burst",
    ],
  },
  {
    name: "AMBIGUOUS BEHAVIOR",
    agentId: "agent-travel-02",
    originalIntent: "Book accommodation in Bengaluru for client meetings under ₹35,000",
    merchant: "Grand Imperial Suites",
    amount: 32000,
    category: "Travel",
    destination: "unverified-vendor",
    familiarMerchant: false,
    velocityCount: 1,
    trajectory: [
      "Parsed user travel request",
      "Searched Bengaluru accommodations",
      "Selected unverified boutique hotel",
      "Amount ₹32,000 exceeds ₹30,000 review threshold",
      "Prepared transaction requiring reviewer approval",
    ],
  },
];

const nav = [
  ["/", "Command Center", LayoutDashboard],
  ["/security-lab", "Security Lab", FlaskConical],
  ["/transactions", "Transactions", ClipboardList],
  ["/agents", "AI Agents", Bot],
  ["/reviews", "Review Queue", Scale],
  ["/security-events", "Security Events", ShieldCheck],
  ["/analytics", "Analytics", BarChart3],
  ["/audit", "Audit Chain", Lock],
  ["/settings", "Settings", Settings],
] as const;

const money = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
    return JSON.stringify(error);
  }
  return "The request could not be completed.";
}

const getError = async <T = unknown,>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => ({}))) as T & { error?: unknown; message?: string };
  if (!response.ok) {
    throw new Error(getErrorMessage(body.error ?? body.message));
  }
  return body;
};

function Badge({ value }: { value: string }) {
  const val = String(value || "").toLowerCase();
  return <span className={`badge ${val}`}>{value}</span>;
}

export default function App() {
  const pathname = usePathname();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [error, setError] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const [razorpayTx, setRazorpayTx] = useState<Transaction | null>(null);

  const refresh = useCallback(async () => {
    try {
      const responses = await Promise.all([
        fetch("/api/transactions").then(getError),
        fetch("/api/agents").then(getError),
        fetch("/api/security-events").then(getError),
        fetch("/api/audit-log").then(getError),
        fetch("/api/stats").then(getError),
      ]);
      const [t, a, e, l, s] = responses as [
        { transactions: Transaction[] },
        { agents: Agent[] },
        { events: SecurityEvent[] },
        { audits: AuditRecord[] },
        Record<string, number | string>,
      ];
      setTransactions(t.transactions || []);
      setAgents(a.agents || []);
      setEvents(e.events || []);
      setAudits(l.audits || []);
      setStats(s || {});
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load live security data.");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const title =
    pathname === "/security-lab"
      ? "Adversarial Security Lab"
      : pathname === "/transactions"
      ? "Transaction Monitor"
      : pathname === "/agents"
      ? "AI Agent Registry"
      : pathname === "/reviews"
      ? "Human Review Queue"
      : pathname === "/security-events"
      ? "Security Events Stream"
      : pathname === "/analytics"
      ? "Evaluation Analytics"
      : pathname === "/audit"
      ? "Cryptographic Audit Ledger"
      : pathname === "/settings"
      ? "Protection Policies"
      : "Command Center";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">INTENTGUARD</div>
          <div className="brand-sub">RUNTIME SECURITY / 01</div>
        </div>
        <nav className="nav">
          {nav.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={pathname === href ? "active" : ""}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <span className="status-dot" />
          All security rails active
          <br />
          <span className="mono">SANDBOX RUNTIME</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Runtime security for agentic payments</div>
            <h1>{title}</h1>
          </div>
          {pathname === "/" && (
            <button className="primary" onClick={() => setSimulating(true)}>
              <Play size={14} fill="currentColor" /> Live Agent Simulation
            </button>
          )}
        </header>

        {error && (
          <div className="result-box" style={{ marginBottom: 14, border: "1px solid var(--red)" }} role="alert">
            {error}{" "}
            <button className="filter" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        )}

        {pathname === "/" ? (
          <Dashboard
            stats={stats}
            transactions={transactions}
            events={events}
            agents={agents}
            audits={audits}
            onSelect={setSelected}
            onOpenSimulation={() => setSimulating(true)}
            onOpenRazorpay={(tx) => setRazorpayTx(tx)}
            onRefresh={refresh}
          />
        ) : pathname === "/security-lab" ? (
          <SecurityLab onSelect={setSelected} onRefresh={refresh} />
        ) : pathname === "/transactions" ? (
          <Transactions transactions={transactions} onSelect={setSelected} />
        ) : pathname === "/agents" ? (
          <Agents agents={agents} />
        ) : pathname === "/reviews" ? (
          <ReviewQueue onUpdated={refresh} />
        ) : pathname === "/security-events" ? (
          <Events events={events} onUpdated={refresh} />
        ) : pathname === "/analytics" ? (
          <Analytics />
        ) : pathname === "/audit" ? (
          <AuditChainView />
        ) : (
          <SettingsPanel />
        )}
      </main>

      {simulating && <LiveSimulation onComplete={refresh} onClose={() => setSimulating(false)} />}
      {selected && (
        <Investigation
          transaction={selected}
          onClose={() => setSelected(null)}
          onOpenRazorpay={(tx) => setRazorpayTx(tx)}
        />
      )}
      {razorpayTx && (
        <RazorpayModal
          transaction={razorpayTx}
          onClose={() => setRazorpayTx(null)}
          onPaymentSuccess={refresh}
        />
      )}
    </div>
  );
}

function Dashboard({
  stats,
  transactions,
  events,
  agents,
  audits,
  onSelect,
  onOpenSimulation,
  onOpenRazorpay,
  onRefresh,
}: {
  stats: Record<string, number | string>;
  transactions: Transaction[];
  events: SecurityEvent[];
  agents: Agent[];
  audits: AuditRecord[];
  onSelect: (t: Transaction) => void;
  onOpenSimulation?: () => void;
  onOpenRazorpay?: (t: Transaction) => void;
  onRefresh?: () => Promise<void>;
}) {
  void onOpenSimulation;
  const distribution = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(
    (level) => transactions.filter((t) => t.riskLevel === level).length
  );

  return (
    <>
      {/* System Status Bar */}
      <div className="status-bar">
        <span style={{ color: "var(--muted)", fontWeight: 700 }}>SYSTEM POSTURE:</span>
        <div className="status-pill">
          <span className="status-dot" />
          <span>IntentGuard Policy Engine: <b style={{ color: "var(--teal)" }}>ACTIVE</b></span>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          <span>ML Model: <b style={{ color: "var(--teal)" }}>ACTIVE</b> <span className="tag-badge tag-synthetic">SYNTHETIC BENCHMARK</span></span>
        </div>
        <div className="status-pill">
          <span className="status-dot" style={{ background: "var(--amber)", boxShadow: "0 0 0 4px #3d301c" }} />
          <span>LLM Investigator: <b style={{ color: "var(--amber)" }}>CONFIGURED</b></span>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          <span>Razorpay: <b style={{ color: "var(--teal)" }}>TEST MODE</b></span>
        </div>
      </div>

      {/* Autonomous Agent Pipeline */}
      <section className="panel" style={{ marginBottom: 24, borderLeft: "3px solid var(--teal)" }}>
        <div className="panel-head" style={{ marginBottom: 14 }}>
          <div>
            <div className="eyebrow">Real-Time Autonomous Agent Execution</div>
            <h2 style={{ marginTop: 4 }}>Command Center Agent Trajectory Runner</h2>
            <div className="subtle" style={{ marginTop: 4 }}>
              Execute the real multi-step autonomous agent loop with continuous IntentGuard per-action verification.
            </div>
          </div>
          <span className="tag-badge tag-live">REAL RUNTIME LOOP</span>
        </div>

        <RealtimeRunner
          onTransactionGenerated={async (tx) => {
            onSelect(tx);
            if (onRefresh) await onRefresh();
          }}
          onOpenRazorpay={onOpenRazorpay}
        />
      </section>

      <div className="grid-stats">
        {[
          ["Transactions Evaluated", stats.total ?? 0, ""],
          ["Allowed", stats.allowed ?? 0, "teal"],
          ["Under Review", stats.review ?? 0, "amber"],
          ["Blocked", stats.blocked ?? 0, "red"],
          ["Active AI Agents", stats.activeAgents ?? 0, ""],
          ["Threats Detected", stats.threats ?? 0, "red"],
          ["Average Risk Score", stats.averageRisk ?? 0, "amber"],
          ["Protection Status", "ACTIVE", "teal"],
        ].map(([label, value, color]) => (
          <div className="stat" key={String(label)}>
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="layout-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Transaction activity</h2>
            <span className="subtle mono">LIVE FEED</span>
          </div>
          <TransactionTable transactions={transactions.slice(0, 6)} onSelect={onSelect} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Risk distribution</h2>
            <Activity size={16} color="#8d9a9c" />
          </div>
          {distribution.map((count, i) => (
            <div className="bar-row" key={i}>
              <span>{["Low", "Medium", "High", "Critical"][i]}</span>
              <div className="bar">
                <div
                  className={`bar-fill ${["low", "medium", "high", "high"][i]}`}
                  style={{ width: `${Math.max(5, transactions.length ? (count / transactions.length) * 100 : 5)}%` }}
                />
              </div>
              <b>{count}</b>
            </div>
          ))}
          <div className="subtle" style={{ marginTop: 30 }}>
            Scoring model: deterministic rules + statistical anomaly analysis
          </div>
        </section>
      </div>

      <div className="layout-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Recent security events</h2>
            <Link className="subtle" href="/security-events">
              View all
            </Link>
          </div>
          {events.slice(0, 4).map((event) => (
            <div className="event" key={event.id}>
              <span className={`severity severity-${event.severity}`} />
              <div>
                <div className="event-title">{event.event}</div>
                <div className="event-meta">
                  {event.agent} · {event.transactionId} · {event.timestamp}
                </div>
              </div>
              <div className="toolbar" style={{ marginLeft: "auto", marginBottom: 0 }}>
                <Badge value={event.severity} />
                <Badge value={event.status} />
              </div>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Agent activity</h2>
            <Link className="subtle" href="/agents">
              Registry
            </Link>
          </div>
          {agents.slice(0, 4).map((agent) => (
            <div className="event" key={agent.id}>
              <Bot size={16} color="#64d7c0" />
              <div>
                <div className="event-title">{agent.name}</div>
                <div className="event-meta">
                  {agent.transactions} transactions · trust {agent.trustScore}% · {agent.lastActivity}
                </div>
              </div>
              <Badge value={agent.status} />
            </div>
          ))}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Cryptographic audit log</h2>
            <div className="subtle mono" style={{ marginTop: 4 }}>
              SHA-256 HASH CHAIN · {audits.length} RECORDS
            </div>
          </div>
          <Link href="/audit" className="filter" style={{ textDecoration: "none", fontSize: 11 }}>
            View Full Ledger
          </Link>
        </div>
        {audits.length ? (
          audits.slice(0, 4).map((audit) => (
            <div className="event" key={audit.transactionId + audit.currentHash}>
              <ClipboardList size={15} color="#64d7c0" />
              <div>
                <div className="event-title">
                  {audit.transactionId} · {audit.engineVersion ?? "Transaction"}
                </div>
                <div className="event-meta mono">
                  {audit.previousHash?.slice(0, 16)}... → {audit.currentHash?.slice(0, 16)}...
                </div>
              </div>
              <Badge value={audit.decision || "RECORDED"} />
            </div>
          ))
        ) : (
          <div className="empty">Audit records appear after transactions are evaluated.</div>
        )}
      </section>

      {/* Strategic Differentiation & Counterfactual Section */}
      <DifferentiationSection />
    </>
  );
}

function TransactionTable({
  transactions,
  onSelect,
}: {
  transactions: Transaction[];
  onSelect: (t: Transaction) => void;
}) {
  return (
    <div className="table-wrap">
      {transactions.length ? (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Agent</th>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Risk</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr className="clickable" onClick={() => onSelect(t)} key={t.id}>
                <td className="mono">{t.id}</td>
                <td>{t.agentName}</td>
                <td>{t.merchant}</td>
                <td>{money(t.amount)}</td>
                <td>
                  <span className={`badge ${t.riskLevel?.toLowerCase()}`}>
                    {t.riskScore} / {t.riskLevel}
                  </span>
                </td>
                <td>
                  <Badge value={t.decision} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">No transactions found.</div>
      )}
    </div>
  );
}

function Transactions({
  transactions,
  onSelect,
}: {
  transactions: Transaction[];
  onSelect: (t: Transaction) => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const visible = filter === "ALL" ? transactions : transactions.filter((t) => t.decision === filter);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>All evaluated transactions</h2>
          <div className="subtle" style={{ marginTop: 5 }}>
            Every action trajectory is evaluated before authorization.
          </div>
        </div>
        <span className="mono subtle">{transactions.length} RECORDS</span>
      </div>
      <div className="toolbar">
        {["ALL", "ALLOW", "REVIEW", "BLOCK"].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`filter ${filter === item ? "selected" : ""}`}
          >
            {item}
          </button>
        ))}
      </div>
      <TransactionTable transactions={visible} onSelect={onSelect} />
    </section>
  );
}

function Events({ events, onUpdated }: { events: SecurityEvent[]; onUpdated: () => Promise<void> }) {
  const [filter, setFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const visible = filter === "ALL" ? events : events.filter((e) => e.severity === filter);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Security Detection Stream</h2>
          <div className="subtle" style={{ marginTop: 5 }}>
            Signals generated by deterministic policy and anomaly analysis.
          </div>
        </div>
        <span className="mono subtle">{events.length} EVENTS</span>
      </div>
      <div className="toolbar">
        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`filter ${filter === item ? "selected" : ""}`}
          >
            {item}
          </button>
        ))}
      </div>

      {visible.length ? (
        visible.map((event) => (
          <div className="event" key={event.id}>
            <span className={`severity severity-${event.severity}`} />
            <div>
              <div className="event-title">{event.event}</div>
              <div className="event-meta">
                {event.agent} · {event.transactionId} · {event.timestamp}
              </div>
            </div>
            <div className="toolbar" style={{ marginLeft: "auto", marginBottom: 0 }}>
              <Badge value={event.severity} />
              <Badge value={event.status} />
              <button className="filter" onClick={() => setSelectedEvent(event)}>
                Change Status
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="empty">No security events matching filter.</div>
      )}

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSuccess={async () => {
            setSelectedEvent(null);
            await onUpdated();
          }}
        />
      )}
    </section>
  );
}

function EventModal({
  event,
  onClose,
  onSuccess,
}: {
  event: SecurityEvent;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [status, setStatus] = useState<SecurityEvent["status"]>(event.status);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for this status change.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/security-events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: reason.trim() }),
      });
      await getError(response);
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="panel-head">
          <h2>Update Event Status</h2>
          <button className="close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="subtle">
          Event: <b>{event.event}</b> ({event.id})
        </p>
        <label className="kv" style={{ display: "block", margin: "16px 0 8px" }}>
          Target Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SecurityEvent["status"])}
            style={{ width: "100%", padding: 8, marginTop: 6, background: "#0d1517", color: "var(--ink)", border: "1px solid var(--line)" }}
          >
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>
        </label>
        <label className="kv" style={{ display: "block", margin: "16px 0 8px" }}>
          Reason for Transition (Required)
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Document rationale for audit trail..."
            style={{ width: "100%", padding: 8, marginTop: 6, background: "#0d1517", color: "var(--ink)", border: "1px solid var(--line)" }}
          />
        </label>
        {error && (
          <div className="result-box" style={{ border: "1px solid var(--red)", marginBottom: 12 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Saving..." : "Confirm & Hash into Audit Trail"}
          </button>
          <button className="filter" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewQueue({ onUpdated }: { onUpdated: () => Promise<void> }) {
  type ReviewItem = {
    id: string;
    transactionId: string;
    reason: string;
    createdAt: string;
    transaction: Transaction;
  };

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState<{ id: string; action: "approve" | "reject" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reviews");
      const body = await getError<{ reviews: ReviewItem[] }>(response);
      setReviews(body.reviews || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);


  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Human Review Queue</h2>
          <div className="subtle" style={{ marginTop: 5 }}>
            Ambiguous or high-value agent payment attempts require operator authorization.
          </div>
        </div>
        <span className="mono subtle">{reviews.length} PENDING</span>
      </div>

      {loading ? (
        <div className="empty">Loading pending review cases...</div>
      ) : error ? (
        <div className="result-box" style={{ border: "1px solid var(--red)" }}>
          {error}
        </div>
      ) : reviews.length === 0 ? (
        <div className="empty">
          <CheckCircle2 size={32} color="#64d7c0" style={{ marginBottom: 12 }} />
          <div>Review queue is clear. No agent transactions are currently blocked on human review.</div>
        </div>
      ) : (
        reviews.map((r) => (
          <div className="event" key={r.id} style={{ alignItems: "center", padding: "16px 0" }}>
            <AlertTriangle size={20} color="#f2bd6f" />
            <div style={{ flex: 1 }}>
              <div className="event-title" style={{ fontSize: 14 }}>
                {r.transaction.merchant} · {money(r.transaction.amount)} ({r.transaction.id})
              </div>
              <div className="event-meta" style={{ marginTop: 4 }}>
                Agent: <b>{r.transaction.agentName}</b> · Risk score: {r.transaction.riskScore} · {r.reason}
              </div>
              <div className="subtle mono" style={{ marginTop: 4, fontSize: 11 }}>
                Intent: &quot;{r.transaction.originalIntent}&quot;
              </div>
            </div>
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <button
                className="filter"
                style={{ borderColor: "var(--teal)", color: "var(--teal)" }}
                onClick={() => setResolving({ id: r.id, action: "approve" })}
              >
                Approve
              </button>
              <button
                className="filter"
                style={{ borderColor: "var(--red)", color: "var(--red)" }}
                onClick={() => setResolving({ id: r.id, action: "reject" })}
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      {resolving && (
        <ReviewModal
          reviewId={resolving.id}
          action={resolving.action}
          onClose={() => setResolving(null)}
          onSuccess={async () => {
            setResolving(null);
            await load();
            await onUpdated();
          }}
        />
      )}
    </section>
  );
}

function ReviewModal({
  reviewId,
  action,
  onClose,
  onSuccess,
}: {
  reviewId: string;
  action: "approve" | "reject";
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (action === "reject" && !resolution.trim()) {
      setError("Rejection requires a documented reason.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/reviews/${reviewId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: resolution.trim() || (action === "approve" ? "Approved by reviewer" : "") }),
      });
      await getError(response);
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="panel-head">
          <h2>{action === "approve" ? "Approve Transaction" : "Reject Transaction"}</h2>
          <button className="close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="subtle">
          {action === "approve"
            ? "Authorizing this transaction will allow payment progression and hash the decision into the audit chain."
            : "Rejecting this transaction will permanently block execution and record the violation."}
        </p>
        <label className="kv" style={{ display: "block", margin: "16px 0 8px" }}>
          {action === "reject" ? "Rejection Reason (Required)" : "Approval Note (Optional)"}
          <textarea
            rows={3}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder={action === "reject" ? "Why is this transaction rejected?" : "e.g. Verified with manager via chat"}
            style={{ width: "100%", padding: 8, marginTop: 6, background: "#0d1517", color: "var(--ink)", border: "1px solid var(--line)" }}
          />
        </label>
        {error && (
          <div className="result-box" style={{ border: "1px solid var(--red)", marginBottom: 12 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            className="primary"
            style={{ background: action === "approve" ? "var(--teal)" : "var(--red)", color: action === "approve" ? "#08211f" : "#fff" }}
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? "Processing..." : action === "approve" ? "Authorize Payment" : "Block Transaction"}
          </button>
          <button className="filter" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditChainView() {
  type AuditItem = {
    id: string;
    sequence: number;
    entityType: string;
    entityId: string;
    timestamp: string;
    decision: string;
    previousHash: string;
    currentHash: string;
    payload: Record<string, unknown>;
  };

  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [verification, setVerification] = useState<{
    valid: boolean;
    recordsChecked: number;
    firstInvalidRecord: string | null;
    reason: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditItem | null>(null);

  const loadAudits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-log");
      const data = await getError<{ audits: AuditItem[] }>(res);
      setAudits(data.audits || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  const runVerification = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/audit/verify");
      const result = await getError<{
        valid: boolean;
        recordsChecked: number;
        firstInvalidRecord: string | null;
        reason: string | null;
      }>(res);
      setVerification(result);
    } catch {
      // Handled
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAudits();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAudits]);


  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>SHA-256 Tamper-Evident Ledger</h2>
            <div className="subtle" style={{ marginTop: 5 }}>
              Every evaluation, policy edit, and reviewer decision is cryptographically chained.
            </div>
          </div>
          <button className="primary" onClick={() => void runVerification()} disabled={verifying}>
            <ShieldCheck size={16} />
            {verifying ? "Verifying hashes..." : "Verify Hash Chain Integrity"}
          </button>
        </div>

        {verification && (
          <div
            className="result-box"
            style={{
              marginBottom: 20,
              border: `1px solid ${verification.valid ? "var(--teal)" : "var(--red)"}`,
              background: verification.valid ? "#0c2522" : "#301313",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {verification.valid ? (
                <>
                  <CheckCircle2 size={18} color="var(--teal)" />
                  <strong style={{ color: "var(--teal)" }}>CHAIN INTEGRITY VERIFIED (ALL BLOCKS VALID)</strong>
                </>
              ) : (
                <>
                  <AlertTriangle size={18} color="var(--red)" />
                  <strong style={{ color: "var(--red)" }}>CHAIN TAMPERING DETECTED</strong>
                </>
              )}
            </div>
            <div className="subtle" style={{ marginTop: 6, color: "var(--ink)" }}>
              {verification.valid
                ? `Successfully recalculated SHA-256 digests across all ${verification.recordsChecked} records. Linkage from GENESIS to latest block is unbroken.`
                : `Verification failed at record ${verification.firstInvalidRecord}: ${verification.reason}`}
            </div>
          </div>
        )}

        <div className="table-wrap">
          {loading ? (
            <div className="empty">Loading audit records...</div>
          ) : audits.length ? (
            <table>
              <thead>
                <tr>
                  <th>Seq</th>
                  <th>Entity</th>
                  <th>ID</th>
                  <th>Decision / Action</th>
                  <th>Previous Hash → Block Hash</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">#{a.sequence}</td>
                    <td>
                      <b>{a.entityType}</b>
                    </td>
                    <td className="mono">{a.entityId}</td>
                    <td>
                      <Badge value={a.decision} />
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      <span style={{ color: "var(--muted)" }}>{a.previousHash.slice(0, 10)}...</span> →{" "}
                      <span style={{ color: "var(--teal)" }}>{a.currentHash.slice(0, 10)}...</span>
                    </td>
                    <td className="subtle">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : "just now"}</td>
                    <td>
                      <button className="filter" onClick={() => setSelectedAudit(a)}>
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No audit records found.</div>
          )}
        </div>
      </section>

      {selectedAudit && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 650 }}>
            <div className="panel-head">
              <h2>Audit Block #{selectedAudit.sequence}</h2>
              <button className="close" onClick={() => setSelectedAudit(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="result-box mono" style={{ marginBottom: 12 }}>
              <div>Previous Hash: {selectedAudit.previousHash}</div>
              <div>Block Hash: {selectedAudit.currentHash}</div>
            </div>
            <h3>Canonical Payload</h3>
            <pre
              style={{
                background: "#081012",
                padding: 14,
                border: "1px solid var(--line)",
                borderRadius: 4,
                overflowX: "auto",
                fontSize: 12,
              }}
            >
              {JSON.stringify(selectedAudit.payload, null, 2)}
            </pre>
            <button className="primary" style={{ marginTop: 14 }} onClick={() => setSelectedAudit(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Agents({ agents }: { agents: Agent[] }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Registered agents</h2>
          <div className="subtle" style={{ marginTop: 5 }}>
            Trust and activity posture across autonomous payment actors.
          </div>
        </div>
        <span className="mono subtle">{agents.length} AGENTS</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Status</th>
              <th>Trust</th>
              <th>Transactions</th>
              <th>Allowed</th>
              <th>Review</th>
              <th>Blocked</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/agents/${a.id}`}>
                    <b>{a.name}</b>
                  </Link>
                  <br />
                  <span className="subtle mono">{a.id}</span>
                </td>
                <td>
                  <Badge value={a.status} />
                </td>
                <td className="mono">{a.trustScore}%</td>
                <td>{a.transactions}</td>
                <td className="teal">{a.allowed}</td>
                <td className="amber">{a.review}</td>
                <td className="red">{a.blocked}</td>
                <td className="subtle">{a.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SettingsPanel() {
  const [policy, setPolicy] = useState({
    maxSpendingLimit: 50000,
    requiresReviewAbove: 30000,
    velocityThreshold: 3,
    riskThreshold: 60,
    allowedCategories: ["Electronics", "Office"],
    allowedMerchants: ["Croma Digital", "OfficeMart"],
    paymentMode: "TEST",
  });
  const [message, setMessage] = useState("Loading policy...");

  useEffect(() => {
    void fetch("/api/policies")
      .then((response) => response.json())
      .then((body) => {
        if (body.policy) {
          setPolicy({
            maxSpendingLimit: Number(body.policy.maxSpendingLimit),
            requiresReviewAbove: Number(body.policy.requiresReviewAbove),
            velocityThreshold: body.policy.velocityThreshold,
            riskThreshold: body.policy.riskThreshold,
            allowedCategories: body.policy.allowedCategories,
            allowedMerchants: body.policy.allowedMerchants,
            paymentMode: "TEST",
          });
        }
        setMessage("");
      })
      .catch(() => setMessage("Unable to load policy."));
  }, []);

  const save = async () => {
    setMessage("Saving policy...");
    const response = await fetch("/api/policies", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(policy),
    });
    setMessage(response.ok ? "Policy saved as a new version in audit ledger." : "Policy update failed.");
  };

  return (
    <section className="panel" style={{ maxWidth: 760 }}>
      <div className="panel-head">
        <div>
          <h2>Protection configuration</h2>
          <div className="subtle" style={{ marginTop: 5 }}>
            Deterministic runtime limits applied before agent transactions can proceed.
          </div>
        </div>
        <Badge value="TEST" />
      </div>
      <label className="kv">
        Maximum spend limit (₹)
        <input
          type="number"
          value={policy.maxSpendingLimit}
          onChange={(event) => setPolicy({ ...policy, maxSpendingLimit: Number(event.target.value) })}
        />
      </label>
      <label className="kv">
        Require human review above (₹)
        <input
          type="number"
          value={policy.requiresReviewAbove}
          onChange={(event) => setPolicy({ ...policy, requiresReviewAbove: Number(event.target.value) })}
        />
      </label>
      <label className="kv">
        Velocity threshold (transactions / 5 min)
        <input
          type="number"
          value={policy.velocityThreshold}
          onChange={(event) => setPolicy({ ...policy, velocityThreshold: Number(event.target.value) })}
        />
      </label>
      <label className="kv">
        Risk threshold (0 - 100)
        <input
          type="number"
          value={policy.riskThreshold}
          onChange={(event) => setPolicy({ ...policy, riskThreshold: Number(event.target.value) })}
        />
      </label>
      {message && <p className="subtle">{message}</p>}
      <button className="primary" onClick={() => void save()}>
        Save policy version
      </button>
      <div className="result-box" style={{ marginTop: 20 }}>
        <b>TEST environment active</b>
        <br />
        <span className="subtle">
          No live payment rails are enabled. Every policy modification increments version and is hashed into the SHA-256 audit ledger.
        </span>
      </div>
    </section>
  );
}

function Analytics() {
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/evaluation")
      .then(getError)
      .then((data) => setEvaluation(data as EvaluationResponse))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load evaluation."));
  }, []);

  const metrics = evaluation?.metrics;
  const percent = (value?: number) => (value === undefined ? "..." : `${(value * 100).toFixed(1)}%`);

  if (error)
    return (
      <section className="panel">
        <div className="empty">{error}</div>
      </section>
    );

  return (
    <>
      {!evaluation ? (
        <section className="panel">
          <div className="empty">Loading evaluation analytics...</div>
        </section>
      ) : (
        <>
          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Measurement layer</div>
                <h2 style={{ marginTop: 6 }}>Synthetic Held-Out Trajectory Evaluation</h2>
                <div className="subtle" style={{ marginTop: 7 }}>
                  Measured on realistic held-out agent action sequences isolated from runtime tuning.
                </div>
              </div>
              <Badge value="SYNTHETIC" />
            </div>
            <div className="grid-stats">
              {[
                ["Test set size", evaluation.dataset?.test_samples, ""],
                ["Precision", percent(metrics?.precision), "teal"],
                ["Recall", percent(metrics?.recall), "teal"],
                ["F1 score", percent(metrics?.f1), "teal"],
                ["Accuracy", percent(metrics?.accuracy), "amber"],
                ["False-positive rate", percent(metrics?.false_positive_rate), ""],
                ["False-negative rate", percent(metrics?.false_negative_rate), "red"],
              ].map(([label, value, color]) => (
                <div className="stat" key={String(label)}>
                  <div className="stat-label">{label}</div>
                  <div className={`stat-value ${color}`}>{value}</div>
                </div>
              ))}
            </div>
            <div className="result-box" style={{ marginTop: 14 }}>
              <b>Evaluation Integrity Notice</b>
              <br />
              <span className="subtle">
                Dataset: {evaluation.dataset?.name}. These measurements describe this synthetic evaluation corpus to measure drift detection accuracy, not live production payment performance.
              </span>
            </div>
          </section>

          <section className="panel" style={{ marginTop: 14 }}>
            <div className="panel-head">
              <h2>Confusion Matrix</h2>
              <span className="mono subtle">ACTUAL × PREDICTED</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Predicted Risky</th>
                    <th>Predicted Benign</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Actual Risky</th>
                    <td className="red">TP · {evaluation.confusion_matrix?.true_positive}</td>
                    <td>FN · {evaluation.confusion_matrix?.false_negative}</td>
                  </tr>
                  <tr>
                    <th>Actual Benign</th>
                    <td>FP · {evaluation.confusion_matrix?.false_positive}</td>
                    <td className="teal">TN · {evaluation.confusion_matrix?.true_negative}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function LiveSimulation({ onComplete, onClose }: { onComplete: () => Promise<void>; onClose: () => void }) {
  const [customIntent, setCustomIntent] = useState("");
  const [scenario, setScenario] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);
  const [error, setError] = useState("");

  const selected = scenarios[scenario];

  const start = async () => {
    setRunning(true);
    setError("");
    const originalIntent = customIntent.trim() || selected.originalIntent;

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const actions = selected.trajectory.slice(0, -1).map((step) => ({
        tool: "search_catalog",
        parameters: { step, category: selected.category },
      }));

      const executePayload = {
        agentId: selected.agentId,
        originalIntent,
        actions: [
          ...actions,
          {
            tool: "prepare_checkout",
            parameters: {
              productId: "demo-selected-item",
              merchant: selected.merchant,
              amount: selected.amount,
              category: selected.category,
              destination: selected.destination,
            },
          },
        ],
      };

      const executeResponse = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(executePayload),
      });

      const execution = (await getError(executeResponse)) as { transaction: Transaction };
      setResult(execution.transaction);
      await onComplete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Simulation failed safely.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="panel-head">
          <div>
            <div className="eyebrow">Controlled agent trajectory</div>
            <h2 style={{ marginTop: 6 }}>Live Agent Simulation</h2>
          </div>
          <button className="close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        {!result && !running && (
          <>
            <label className="subtle" htmlFor="intent">
              What do you want the AI agent to buy?
            </label>
            <textarea
              id="intent"
              value={customIntent}
              onChange={(event) => setCustomIntent(event.target.value)}
              placeholder="e.g. Buy me a laptop under ₹50,000"
              rows={2}
              style={{
                width: "100%",
                marginTop: 8,
                padding: 12,
                background: "#0f1a1c",
                color: "var(--ink)",
                border: "1px solid var(--line)",
              }}
            />

            <div className="scenario-grid">
              {scenarios.map((item, index) => (
                <button
                  className={`scenario ${scenario === index ? "active" : ""}`}
                  onClick={() => setScenario(index)}
                  key={item.name}
                >
                  <strong>
                    SCENARIO {index + 1} · {item.name}
                  </strong>
                  <span>
                    {item.originalIntent} · {money(item.amount)} from {item.merchant}
                  </span>
                </button>
              ))}
            </div>

            {error && (
              <div className="result-box" role="alert" style={{ border: "1px solid var(--red)", marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button className="primary" onClick={() => void start()}>
              Start agent simulation <Play size={14} fill="currentColor" />
            </button>
          </>
        )}

        {running && (
          <div className="result">
            <div className="subtle mono">EVALUATING AGENT TRAJECTORY</div>
            {selected.trajectory.map((step) => (
              <div key={step} style={{ lineHeight: 2, fontSize: 13 }}>
                ✓ {step}
              </div>
            ))}
            <div style={{ marginTop: 10, color: "var(--teal)" }}>
              → IntentGuard evaluating intent alignment, spend caps & anomaly signals...
            </div>
          </div>
        )}

        {result && (
          <div className="result">
            <div className="subtle mono">INTENTGUARD DECISION · {result.id}</div>
            <div className={`decision ${result.decision}`}>{result.decision}</div>
            <div className="subtle">
              Risk score <b style={{ color: "var(--ink)" }}>{result.riskScore} / 100</b> · {result.riskLevel}
            </div>

            <div className="result-grid">
              <div className="result-box">
                <span className="subtle">USER INTENT</span>
                <br />
                {result.originalIntent}
              </div>
              <div className="result-box">
                <span className="subtle">FINAL TRANSACTION PROPOSAL</span>
                <br />
                {result.merchant} · {money(result.amount)} · {result.category}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              {result.factors
                .filter((factor) => factor.score > 0)
                .map((factor) => (
                  <div className="event" key={factor.factor}>
                    <span className={`severity severity-${factor.severity}`} />
                    <div className="event-title">
                      {factor.factor}: {factor.explanation}
                    </div>
                  </div>
                ))}
            </div>

            <div className="result-box mono" style={{ marginTop: 14 }}>
              <div>SHA-256 Link: {result.previousHash?.slice(0, 16)}... → {result.auditHash?.slice(0, 16)}...</div>
            </div>

            <button className="primary" style={{ marginTop: 18 }} onClick={onClose}>
              Close result
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Investigation({
  transaction,
  onClose,
  onOpenRazorpay,
}: {
  transaction: Transaction;
  onClose: () => void;
  onOpenRazorpay?: (tx: Transaction) => void;
}) {
  const intentLimitMatch = transaction.originalIntent?.match(/(?:under|below|less than|maximum|max)\s*[₹$]?\s*([\d,]+)/i)?.[1];
  const parsedLimit = intentLimitMatch ? Number(intentLimitMatch.replace(/,/g, "")) : undefined;
  const deviationPercent =
    parsedLimit && transaction.amount > parsedLimit
      ? Math.round(((transaction.amount - parsedLimit) / parsedLimit) * 100)
      : 0;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: "min(920px, 100%)" }}>
        <div className="panel-head">
          <div>
            <div className="eyebrow">Decision Card / {transaction.id}</div>
            <h2 style={{ marginTop: 6 }}>IntentGuard Comprehensive Decision Card</h2>
          </div>
          <button className="close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className="detail-grid">
          <div>
            <div className="result-box" style={{ marginBottom: 14 }}>
              <div className="subtle">ORIGINAL USER INTENT (MANDATE)</div>
              <p style={{ margin: "6px 0 12px 0", fontWeight: 600 }}>{transaction.originalIntent}</p>

              <div className="subtle">ACTUAL AGENT ACTION / PROPOSAL</div>
              <p style={{ margin: "6px 0 12px 0" }}>
                <b>{transaction.merchant}</b> · {money(transaction.amount)} ({transaction.category})
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div>
                  <div className="subtle">INTENT CONSISTENCY</div>
                  <div
                    className="decision"
                    style={{
                      fontSize: 22,
                      marginTop: 4,
                      color: transaction.intentConsistencyScore < 70 ? "var(--red)" : "var(--teal)",
                    }}
                  >
                    {transaction.intentConsistencyScore}%
                  </div>
                </div>
                <div>
                  <div className="subtle">INTENT DEVIATION</div>
                  <div
                    className="decision"
                    style={{
                      fontSize: 22,
                      marginTop: 4,
                      color: deviationPercent > 0 ? "var(--red)" : "var(--teal)",
                    }}
                  >
                    {deviationPercent > 0 ? `+${deviationPercent}%` : "0% (Aligned)"}
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-head">
              <h2>Risk factors breakdown</h2>
              <span className="mono subtle">SCORE {transaction.riskScore} / 100</span>
            </div>
            {transaction.factors.map((factor) => (
              <div className="factor" key={factor.factor}>
                <div className="factor-head">
                  <b>{factor.factor}</b>
                  <Badge value={`${factor.score} / ${factor.severity}`} />
                </div>
                <p>{factor.explanation}</p>
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <h2>Secondary Advisory Signals</h2>
              <div className="result-box" style={{ marginTop: 8, fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>ML Risk Probability:</strong>
                  <span className="tag-badge tag-synthetic">SYNTHETIC BENCHMARK</span>
                </div>
                <div style={{ marginTop: 4, color: transaction.mlScore ? (transaction.mlScore > 50 ? "var(--red)" : "var(--teal)") : "var(--muted)" }}>
                  {transaction.mlScore !== null && transaction.mlScore !== undefined
                    ? `${transaction.mlScore.toFixed(1)}% estimated risk signal (${transaction.modelVersion ?? "intentguard-ml-1.0.0"})`
                    : "ML Inference Model: ACTIVE (Advisory benchmark)"}
                </div>
              </div>

              <div className="result-box" style={{ marginTop: 8, fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>LLM Investigator:</strong>
                  <span className="subtle mono">STRUCTURED ANALYSIS</span>
                </div>
                <div style={{ marginTop: 4, color: "var(--muted)" }}>
                  Secondary LLM investigator advisory retained. Deterministic IntentGuard security policies remain authoritative.
                </div>
              </div>
            </div>
          </div>

          <div>
            <div
              className="result-box"
              style={{
                marginBottom: 20,
                border: `1px solid ${
                  transaction.decision === "ALLOW"
                    ? "var(--teal)"
                    : transaction.decision === "REVIEW"
                    ? "var(--amber)"
                    : "var(--red)"
                }`,
                background:
                  transaction.decision === "ALLOW"
                    ? "#0c1f1c"
                    : transaction.decision === "REVIEW"
                    ? "#1f1a11"
                    : "#221214",
              }}
            >
              <div className="subtle">INTENTGUARD RUNTIME VERDICT</div>
              <div className={`decision ${transaction.decision}`} style={{ fontSize: 26, marginTop: 4 }}>
                {transaction.decision}
              </div>
              <div className="subtle" style={{ marginTop: 4 }}>
                {transaction.riskLevel} risk · {transaction.timestamp}
              </div>

              <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #293838", fontSize: 11 }}>
                <b>Recommended Action:</b>{" "}
                {transaction.decision === "ALLOW"
                  ? "Authorize checkout. Action satisfies all intent constraints and spending boundaries."
                  : transaction.decision === "REVIEW"
                  ? "Elevated risk detected. Hold transaction in Human Review Queue pending analyst authorization."
                  : "Terminate agent trajectory and block payment gateway handoff immediately."}
              </div>

              <div style={{ marginTop: 16 }}>
                {transaction.decision === "ALLOW" ? (
                  <button
                    className="btn-razorpay"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      onClose();
                      if (onOpenRazorpay) onOpenRazorpay(transaction);
                    }}
                  >
                    <CreditCard size={16} /> Proceed to Razorpay TEST Checkout
                  </button>
                ) : transaction.decision === "REVIEW" ? (
                  <div
                    style={{
                      padding: 10,
                      background: "#2e2415",
                      border: "1px solid var(--amber)",
                      color: "var(--amber)",
                      borderRadius: 4,
                      fontSize: 11,
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    Human Review Required — Checkout Locked
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 10,
                      background: "#2b1416",
                      border: "1px solid var(--red)",
                      color: "var(--red)",
                      borderRadius: 4,
                      fontSize: 11,
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    Payment Execution Blocked — IntentGuard Protected
                  </div>
                )}
              </div>
            </div>

            <h2 style={{ marginBottom: 12 }}>Deterministic Security Checks</h2>
            {transaction.checks.map((check) => (
              <div className="check" key={check.name}>
                <Badge value={check.status} />
                <div>
                  <div className="check-name">{check.name}</div>
                  <p>{check.explanation}</p>
                </div>
              </div>
            ))}

            <h2 style={{ margin: "20px 0 10px" }}>Tamper-Evident Hash Proof</h2>
            <div className="result-box mono" style={{ fontSize: 11 }}>
              <div>Previous Block: {transaction.previousHash ?? "GENESIS"}</div>
              <div style={{ color: "var(--teal)", marginTop: 4 }}>
                Current Block: {transaction.auditHash ?? "Generated in audit ledger"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
