"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "min(420px, 100%)", display: "grid", gap: 14, padding: 28, border: "1px solid var(--line)", background: "var(--panel)", textAlign: "center" }}>
        <div className="eyebrow" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <ShieldCheck size={16} /> IntentGuard Demo Mode
        </div>
        <h1 style={{ fontSize: 24 }}>Direct Demo Access</h1>
        <p className="subtle">Authentication is disabled for this buildathon evaluation. Redirecting to the Command Center...</p>
        <Link href="/" className="primary" style={{ justifyContent: "center", marginTop: 8 }}>
          Open Command Center
        </Link>
      </div>
    </main>
  );
}

