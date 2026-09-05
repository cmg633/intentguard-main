"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bot } from "lucide-react";

import { AppShell } from "@/components/layout-shell";

type Agent = {
  id: string;
  name: string;
  status: string;
  trustScore: number;
  transactions?: number;
  allowed?: number;
  review?: number;
  blocked?: number;
  trajectories: Array<{
    id: string;
    status: string;
    startedAt: string;
    transaction?: { id: string; amount: string | number; merchant?: string };
  }>;
};

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      fetch(`/api/agents/${encodeURIComponent(id)}`)
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            const msg = typeof body.error === "string" ? body.error : body.error?.message || "Agent not found.";
            throw new Error(msg);
          }
          return body.agent;
        })
        .then(setAgent)
        .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load agent.")),
    [id]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async () => {
    if (!agent) return;
    const status = agent.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const response = await fetch(`/api/agents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setError("Unable to update agent status.");
      return;
    }
    await load();
  };

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="eyebrow">Agent Profile &amp; Posture</div>
          <h1>{agent ? agent.name : id}</h1>
        </div>
        <Link href="/agents" className="filter" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={14} /> Back to registry
        </Link>
      </div>

      {error ? (
        <section className="panel">
          <div className="result-box" style={{ border: "1px solid var(--red)" }}>
            {error}
          </div>
        </section>
      ) : !agent ? (
        <section className="panel">
          <div className="empty">Loading agent details...</div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-head">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bot size={20} color="#64d7c0" />
                <span className="mono subtle">{agent.id}</span>
                <span className={`badge ${agent.status.toLowerCase()}`}>{agent.status}</span>
              </div>
              <p className="subtle" style={{ marginTop: 6 }}>
                Runtime Trust Score: <b>{agent.trustScore}%</b>
              </p>
            </div>
            <button className="filter" onClick={() => void toggle()}>
              {agent.status === "ACTIVE" ? "Pause agent" : "Enable agent"}
            </button>
          </div>

          <h2 style={{ margin: "24px 0 12px" }}>Recent payment trajectories</h2>
          {agent.trajectories && agent.trajectories.length ? (
            agent.trajectories.map((trajectory) => (
              <div className="event" key={trajectory.id}>
                <div>
                  <div className="event-title">{trajectory.id}</div>
                  <div className="event-meta">
                    Status: <span className="mono">{trajectory.status}</span> ·{" "}
                    {trajectory.transaction ? (
                      <Link href={`/transactions/${trajectory.transaction.id}`} className="subtle" style={{ color: "var(--teal)" }}>
                        {trajectory.transaction.id} · ₹{Number(trajectory.transaction.amount).toLocaleString("en-IN")}
                      </Link>
                    ) : (
                      "No checkout action"
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">No trajectories recorded yet for this agent.</div>
          )}
        </section>
      )}
    </AppShell>
  );
}
