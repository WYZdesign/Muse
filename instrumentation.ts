/**
 * Next.js server/edge instrumentation entrypoint.
 *
 * @sentry/nextjs v8+ does NOT auto-load sentry.server.config.ts /
 * sentry.client.config.ts. Without this file those configs were dead code and
 * no production error was ever reported. register() loads them per runtime and
 * onRequestError forwards unhandled server errors to Sentry.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
