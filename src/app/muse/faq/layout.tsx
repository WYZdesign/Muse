import type { Metadata } from "next";
import { getFaqUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "FAQ — Muses by WYZ",
  description: "Frequently asked questions about Muse: launch, verification, pricing, safety, and how it differs from other platforms.",
  alternates: { canonical: getFaqUrl() },
  openGraph: { title: "FAQ — Muses by WYZ", description: "Frequently asked questions about Muses by WYZ: launch, verification, pricing, safety, and how it differs from other platforms.", url: getFaqUrl(), siteName: "Muses by WYZ", type: "website" },
  twitter: { card: "summary", title: "FAQ — Muses by WYZ", description: "Frequently asked questions about Muse: launch, verification, pricing, safety, and how it differs from other platforms." },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
