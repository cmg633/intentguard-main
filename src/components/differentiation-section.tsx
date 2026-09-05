"use client";

import React from "react";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export function DifferentiationSection() {
  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <div className="panel-head">
        <div>
          <div className="eyebrow">Strategic Differentiation</div>
          <h2 style={{ marginTop: 5 }}>Why IntentGuard? · The Agentic Security Paradigm</h2>
          <div className="subtle" style={{ marginTop: 4 }}>
            Why traditional payment fraud systems fail to protect autonomous AI agent transactions.
          </div>
        </div>
        <span className="tag-badge tag-live">PARADIGM COMPARISON</span>
      </div>

      <div className="versus-grid">
        <div className="versus-col traditional">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={18} color="var(--amber)" />
            <strong style={{ fontSize: 13, color: "var(--amber)" }}>Traditional Fraud Detection</strong>
          </div>
          <p style={{ color: "var(--muted)", margin: "0 0 10px 0" }}>
            Designed for human cardholders checking out via web browsers or mobile apps.
          </p>
          <ul style={{ paddingLeft: 18, margin: "0 0 14px 0", color: "var(--ink)", display: "grid", gap: 6 }}>
            <li>Monitors device fingerprints, IP geolocation, and VPNs</li>
            <li>Analyzes cardholder chargeback and dispute history</li>
            <li>Asks: <i>&quot;Does this transaction look stolen or suspicious?&quot;</i></li>
            <li><b>The Agent Blindspot:</b> An AI agent runs on an authorized corporate device with a valid card token. Traditional systems see zero fraud signals and approve the charge.</li>
          </ul>
          <div className="result-box" style={{ background: "#1c1813", border: "1px solid #4a3821" }}>
            <span className="subtle mono">CASE STUDY</span>
            <div style={{ marginTop: 4, fontWeight: 600 }}>User: &quot;Buy headphones under ₹30,000&quot;</div>
            <div style={{ color: "var(--amber)", marginTop: 2 }}>Agent attempts: ₹75,000 luxury purchase</div>
            <div style={{ color: "var(--red)", marginTop: 4, fontWeight: 700 }}>
              Result: APPROVED (Card valid, IP legitimate. ₹75,000 loss).
            </div>
          </div>
        </div>

        <div className="versus-col intentguard">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={18} color="var(--teal)" />
            <strong style={{ fontSize: 13, color: "var(--teal)" }}>IntentGuard Runtime Security</strong>
          </div>
          <p style={{ color: "var(--muted)", margin: "0 0 10px 0" }}>
            Purpose-built runtime gate verifying every autonomous agent step before payment.
          </p>
          <ul style={{ paddingLeft: 18, margin: "0 0 14px 0", color: "var(--ink)", display: "grid", gap: 6 }}>
            <li>Audits the AI agent&apos;s real-time trajectory step-by-step</li>
            <li>Compares tool arguments with the user&apos;s natural-language mandate</li>
            <li>Asks: <i>&quot;Is this actually what the human user authorized?&quot;</i></li>
            <li><b>The Runtime Protection:</b> Detects semantic drift, merchant substitutions, prompt injections, and spend cap breaches. Halts checkout before money moves.</li>
          </ul>
          <div className="result-box" style={{ background: "#0e1e1d", border: "1px solid #1a443d" }}>
            <span className="subtle mono">INTENTGUARD RESULT</span>
            <div style={{ marginTop: 4, fontWeight: 600 }}>User: &quot;Buy headphones under ₹30,000&quot;</div>
            <div style={{ color: "var(--teal)", marginTop: 2 }}>Agent attempts: ₹75,000 luxury purchase</div>
            <div style={{ color: "var(--teal)", marginTop: 4, fontWeight: 700 }}>
              Result: BLOCK (+150% intent drift detected. Payment prevented).
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", marginBottom: 10 }}>
          Counterfactual Analysis: Without vs. With IntentGuard
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="result-box" style={{ border: "1px solid #552424", background: "#1c1214" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)", fontWeight: 700, marginBottom: 6 }}>
              <XCircle size={15} /> WITHOUT INTENTGUARD
            </div>
            <div className="mono" style={{ fontSize: 11, lineHeight: 1.6, color: "var(--muted)" }}>
              User Intent (&quot;Headphones under ₹30k&quot;) <br />
              ↓ <br />
              Manipulated Agent Trajectory (Selects ₹75,000 item) <br />
              ↓ <br />
              Payment Gateway directly invoked <br />
              ↓ <br />
              <b style={{ color: "var(--red)" }}>₹75,000 Debited (Unchecked Financial Loss)</b>
            </div>
          </div>

          <div className="result-box" style={{ border: "1px solid #1f4f46", background: "#0d1c1a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--teal)", fontWeight: 700, marginBottom: 6 }}>
              <CheckCircle2 size={15} /> WITH INTENTGUARD RUNTIME
            </div>
            <div className="mono" style={{ fontSize: 11, lineHeight: 1.6, color: "var(--muted)" }}>
              User Intent (&quot;Headphones under ₹30k&quot;) <br />
              ↓ <br />
              Manipulated Agent Trajectory (Selects ₹75,000 item) <br />
              ↓ <br />
              <b style={{ color: "var(--teal)" }}>IntentGuard Runtime Intercept → BLOCK (+150% drift)</b> <br />
              ↓ <br />
              <b style={{ color: "var(--teal)" }}>Payment Gateway NEVER Invoked (₹0 Funds Lost)</b>
            </div>
          </div>
        </div>
        <div className="subtle mono" style={{ fontSize: 10, marginTop: 8, textAlign: "center" }}>
          * SIMULATED COUNTERFACTUAL COMPARISON — NO PRODUCTION PAYMENT ATTEMPTS OCCURRED WITHOUT VERIFICATION.
        </div>
      </div>
    </section>
  );
}
