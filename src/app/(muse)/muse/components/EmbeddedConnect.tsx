"use client";

import { useState } from "react";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { ConnectComponentsProvider, ConnectAccountOnboarding } from "@stripe/react-connect-js";
import { authFetch } from "../lib/auth-client";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

/**
 * Muse-themed appearance for the embedded Stripe Connect components. Matches the
 * app's dark/gold tokens (bg #0a0612, card #141020, gold #ffd700, purple #d4a5ff)
 * so onboarding looks native instead of a hosted Stripe page.
 */
const APPEARANCE = {
  overlays: "dialog" as const,
  variables: {
    colorPrimary: "#ffd700",
    colorBackground: "#0f0a1a",
    colorText: "#ffffff",
    colorSecondaryText: "#bfbacb",
    colorDanger: "#ff8a80",
    colorSuccess: "#4ecdc4",
    colorBorder: "#241b36",
    borderRadius: "12px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  rules: {
    ".Input": { backgroundColor: "#141020", border: "1px solid #241b36", color: "#ffffff", boxShadow: "none" },
    ".Input:focus": { border: "1px solid #ffd700", boxShadow: "0 0 0 1px #ffd700" },
    ".Input::placeholder": { color: "#8b8299" },
    ".Label": { color: "#bfbacb", fontWeight: "600" },
    ".Heading": { color: "#ffffff" },
    ".Subheading": { color: "#bfbacb" },
    ".Button": { backgroundColor: "#ffd700", color: "#0a0612", fontWeight: "700", borderRadius: "12px" },
    ".Button:hover": { backgroundColor: "#e6c200" },
    ".Link": { color: "#d4a5ff" },
    ".Error": { color: "#ff8a80" },
  },
};

let cachedInstance: StripeConnectInstance | null = null;

/** Lazily create the single ConnectJS instance (client_secret is fetched per call). */
function getInstance(): StripeConnectInstance {
  if (!cachedInstance) {
    cachedInstance = loadConnectAndInitialize({
      publishableKey: PUBLISHABLE_KEY,
      fetchClientSecret: async () => {
        const r = await authFetch("/api/muse/connect", {
          method: "POST",
          body: JSON.stringify({ action: "create-account-session" }),
        });
        const d = await r.json();
        if (!d.clientSecret) throw new Error(d.error || "Could not start Stripe onboarding");
        return d.clientSecret as string;
      },
      appearance: APPEARANCE,
    });
  }
  return cachedInstance;
}

export default function EmbeddedConnect({ onExit }: { onExit: () => void }) {
  const [error, setError] = useState<string | null>(null);

  if (!PUBLISHABLE_KEY) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: "var(--coral)" }}>
        Stripe is not configured (missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).
      </div>
    );
  }

  let instance: StripeConnectInstance;
  try {
    instance = getInstance();
  } catch (e: unknown) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: "var(--coral)" }}>
        {(e as Error)?.message || "Could not initialize Stripe"}
      </div>
    );
  }

  return (
    <div style={{ minHeight: 460 }}>
      {error && (
        <div style={{ padding: 12, marginBottom: 12, borderRadius: 10, background: "#2a1216", color: "#ff8a80", fontSize: 12 }}>
          {error}
        </div>
      )}
      <ConnectComponentsProvider connectInstance={instance}>
        <ConnectAccountOnboarding
          onExit={() => {
            try { onExit(); } catch (e: unknown) { setError((e as Error)?.message || "Something went wrong"); }
          }}
        />
      </ConnectComponentsProvider>
    </div>
  );
}
