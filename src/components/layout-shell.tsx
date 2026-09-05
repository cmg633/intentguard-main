"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  ClipboardList,
  Bot,
  Scale,
  ShieldCheck,
  BarChart3,
  Lock,
  Settings,
} from "lucide-react";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">INTENTGUARD</div>
          <div className="brand-sub">RUNTIME SECURITY / 01</div>
        </div>
        <nav className="nav">
          {nav.map(([href, label, Icon]) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={isActive ? "active" : ""}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="side-foot">
          <span className="status-dot" />
          All security rails active
          <br />
          <span className="mono">SANDBOX RUNTIME</span>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
