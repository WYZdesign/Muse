/** Metadata wrapper for the FAQ route. */
import type { Metadata } from "next";
import { getFaqUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "FAQ — Musa by WYZ",
  description: "Frequently asked questions about Musa: launch, verification, pricing, safety, and how it differs from other platforms.",
  alternates: { canonical: getFaqUrl() },
  openGraph: { title: "FAQ — Musa by WYZ", description: "Frequently asked questions about Musa by WYZ: launch, verification, pricing, safety, and how it differs from other platforms.", url: getFaqUrl(), siteName: "Musa by WYZ", type: "website" },
  twitter: { card: "summary", title: "FAQ — Musa by WYZ", description: "Frequently asked questions about Musa: launch, verification, pricing, safety, and how it differs from other platforms." },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
