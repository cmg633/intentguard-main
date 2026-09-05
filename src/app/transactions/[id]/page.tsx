"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import type { Transaction } from "@/lib/types";
import { AppShell } from "@/components/layout-shell";

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/transactions/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const msg = typeof body.error === "string" ? body.error : body.error?.message || "Transaction not found.";
          throw new Error(msg);
        }
        return body;
      })
      .then(setTransaction)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load transaction."));
  }, [id]);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="eyebrow">Transaction Investigation</div>
          <h1>{id}</h1>
        </div>
        <Link href="/transactions" className="filter" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={14} /> Back to transactions
        </Link>
      </div>

      {error ? (
        <section className="panel">
          <div className="result-box" style={{ border: "1px solid var(--red)" }}>
            {error}
          </div>
        </section>
      ) : !transaction ? (
        <section className="panel">
          <div className="empty">Loading transaction evidence and trajectory...</div>
        </section>
      ) : (
        <section className="panel">
          <div className="detail-grid">
            <div>
              <div className="result-box" style={{ marginBottom: 14 }}>
                <div className="subtle">ORIGINAL USER INTENT</div>
                <p style={{ marginTop: 4 }}>{transaction.originalIntent}</p>

                <div className="subtle" style={{ marginTop: 14 }}>
                  AGENT ACTION PROPOSAL
                </div>
                <p style={{ marginTop: 4 }}>
                  <b>{transaction.merchant}</b> · ₹{Number(transaction.amount).toLocaleString("en-IN")} ({transaction.category})
                </p>

                <div className="subtle" style={{ marginTop: 14 }}>
                  DESTINATION ROUTE
                </div>
                <p className="mono" style={{ marginTop: 4 }}>
                  {transaction.destination}
                </p>

                <div className="subtle" style={{ marginTop: 14 }}>
                  INTENT CONSISTENCY
                </div>
                <p
                  className="decision"
                  style={{
                    fontSize: 26,
                    marginTop: 4,
                    color: transaction.intentConsistencyScore < 70 ? "var(--red)" : "var(--teal)",
                  }}
                >
                  {transaction.intentConsistencyScore}%
                </p>
              </div>

              <div className="panel-head">
                <h2>Risk factors</h2>
                <span className="mono subtle">SCORE {transaction.riskScore}</span>
              </div>
              {transaction.factors?.map((factor) => (
                <div className="factor" key={factor.factor}>
                  <div className="factor-head">
                    <b>{factor.factor}</b>
                    <span className="badge">{factor.score} / {factor.severity}</span>
                  </div>
                  <p>{factor.explanation}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="result-box" style={{ marginBottom: 20 }}>
                <div className="subtle">DECISION</div>
                <div className={`decision ${transaction.decision}`}>{transaction.decision}</div>
                <div className="subtle" style={{ marginTop: 6 }}>
                  {transaction.riskLevel} risk level · {transaction.timestamp}
                </div>
                <div className="subtle" style={{ marginTop: 4 }}>
                  Model: {transaction.modelVersion ?? "intentguard-rules-1.0"}
                </div>
              </div>

              <h2 style={{ marginBottom: 12 }}>Security checks</h2>
              {transaction.checks?.map((check) => (
                <div className="check" key={check.name}>
                  <span className={`badge ${check.status.toLowerCase()}`}>{check.status}</span>
                  <div>
                    <b>{check.name}</b>
                    <p>{check.explanation}</p>
                  </div>
                </div>
              ))}

              <h2 style={{ margin: "22px 0 10px" }}>Tamper-Evident Hash Proof</h2>
              <div className="result-box mono" style={{ fontSize: 11 }}>
                <div>Previous Hash: {transaction.previousHash ?? "GENESIS"}</div>
                <div style={{ color: "var(--teal)", marginTop: 6 }}>
                  Block Hash: {transaction.auditHash ?? "Recorded in SHA-256 ledger"}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
