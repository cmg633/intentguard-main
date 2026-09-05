import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntentGuard | Runtime Security",
  description: "Runtime security for agentic payments",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
