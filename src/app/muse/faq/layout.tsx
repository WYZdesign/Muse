import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Muse",
  description: "Frequently asked questions about Muse: launch, verification, pricing, safety, and how it differs from other platforms.",
  alternates: { canonical: "https://muse.wyzdesign.com/muse/faq" },
  openGraph: { title: "FAQ — Muse", description: "Frequently asked questions about Muse: launch, verification, pricing, safety, and how it differs from other platforms.", url: "https://muse.wyzdesign.com/muse/faq", siteName: "Muse", type: "website" },
  twitter: { card: "summary", title: "FAQ — Muse", description: "Frequently asked questions about Muse: launch, verification, pricing, safety, and how it differs from other platforms." },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
