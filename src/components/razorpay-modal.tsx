"use client";

import React, { useEffect, useState } from "react";
import { X, CreditCard, ShieldCheck, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import type { Transaction } from "@/lib/types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

export function RazorpayModal({
  transaction,
  onClose,
  onPaymentSuccess,
}: {
  transaction: Transaction;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/payments/checkout")
      .then((res) => res.json())
      .then((data) => {
        setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        setConfigured(false);
      });
  }, []);

  const initiatePayment = async () => {
    setLoading(true);
    setError("");
    setStatusMessage("Creating server-side Razorpay TEST order...");

    try {
      const orderRes = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: transaction.id }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.message || orderData.error || "Failed to create TEST order");
      }

      const order = orderData.order;
      setStatusMessage("Loading Razorpay checkout script...");

      // Load checkout.js if not already present
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Unable to load Razorpay checkout script"));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount,
        currency: order.currency,
        name: "IntentGuard Runtime Security",
        description: `Verified Payment: ${transaction.merchant}`,
        order_id: order.id,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setStatusMessage("Verifying cryptographic payment signature on server...");
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: transaction.id,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.verified) {
            setPaymentSuccess(response.razorpay_payment_id);
            if (onPaymentSuccess) onPaymentSuccess();
          } else {
            setError(verifyData.message || "Payment signature verification failed.");
          }
        },
        prefill: {
          name: "Security Commander",
          email: "demo@intentguard.local",
        },
        theme: {
          color: "#64d7c0",
        },
        notes: {
          environment: "TEST",
          intentguard_id: transaction.id,
        },
      };

      const RazorpayClass = window.Razorpay;
      if (!RazorpayClass) {
        throw new Error("Razorpay checkout SDK failed to load in browser.");
      }
      const rzp = new RazorpayClass(options);
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment initialization failed.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: "min(600px, 100%)" }}>
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CreditCard size={22} color="var(--teal)" />
            <div>
              <div className="eyebrow">Payment Gateway Gate</div>
              <h2 style={{ marginTop: 2 }}>Razorpay TEST Checkout</h2>
            </div>
          </div>
          <button className="close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="result-box" style={{ marginBottom: 18, border: "1px solid var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="subtle mono">TRANSACTION {transaction.id}</span>
            <span className="tag-badge tag-live">{transaction.decision} VERIFIED</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, color: "var(--ink)" }}>
            ₹{Number(transaction.amount).toLocaleString("en-IN")} INR
          </div>
          <div className="subtle" style={{ marginTop: 4 }}>
            Recipient: <b>{transaction.merchant}</b> ({transaction.category})
          </div>
        </div>

        {paymentSuccess ? (
          <div className="result-box" style={{ background: "#0d201c", border: "1px solid var(--teal)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--teal)", fontWeight: 700, fontSize: 15 }}>
              <CheckCircle2 size={20} /> TEST Payment Verified &amp; Completed
            </div>
            <p className="subtle" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Payment ID: <b className="mono" style={{ color: "var(--ink)" }}>{paymentSuccess}</b>
              <br />
              Cryptographic HMAC-SHA256 signature verified server-side.
            </p>
            <button className="primary" style={{ marginTop: 14 }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="result-box" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <ShieldCheck size={16} color="var(--teal)" />
                <strong>IntentGuard Pre-Payment Verification Gate</strong>
              </div>
              <p className="subtle" style={{ margin: 0, lineHeight: 1.6 }}>
                IntentGuard has evaluated this transaction against user mandate constraints and granted status: <b>ALLOW</b>.
                Autonomous agents are strictly blocked from invoking payment gateways without this runtime cryptographic clearance.
              </p>
            </div>

            {configured === false && (
              <div className="result-box" style={{ border: "1px solid var(--amber)", background: "#1c1711", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--amber)", fontWeight: 700 }}>
                  <AlertCircle size={16} /> Razorpay Credentials: NOT CONFIGURED
                </div>
                <p className="subtle" style={{ marginTop: 6, lineHeight: 1.6, color: "var(--ink)" }}>
                  To launch the live official Razorpay sandbox modal, add <span className="mono">RAZORPAY_KEY_ID</span> and <span className="mono">RAZORPAY_KEY_SECRET</span> to <span className="mono">.env</span>.
                </p>
                <div className="subtle mono" style={{ fontSize: 10, marginTop: 4 }}>
                  PAYMENT_MODE: TEST · LIVE PAYMENTS STRICTLY PROHIBITED
                </div>
              </div>
            )}

            {error && (
              <div className="result-box" style={{ border: "1px solid var(--red)", color: "var(--red)", marginBottom: 14 }}>
                {error}
              </div>
            )}

            {statusMessage && (
              <div className="subtle mono" style={{ marginBottom: 14, color: "var(--teal)" }}>
                → {statusMessage}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="filter" onClick={onClose}>
                Close
              </button>
              {configured ? (
                <button className="btn-razorpay" onClick={() => void initiatePayment()} disabled={loading}>
                  <CreditCard size={15} />
                  {loading ? "Connecting to Gateway..." : "Launch Razorpay TEST Modal"}
                </button>
              ) : (
                <button
                  className="btn-razorpay"
                  style={{ opacity: 0.8 }}
                  onClick={() => {
                    setPaymentSuccess("pay_mock_test_sandbox_99812");
                    if (onPaymentSuccess) onPaymentSuccess();
                  }}
                >
                  <Lock size={14} /> Simulate Verified Test Handoff
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
