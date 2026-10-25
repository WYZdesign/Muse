/**
 * Browser (client) instrumentation. Next.js loads this before hydration, which
 * is what actually initializes Sentry in the browser under @sentry/nextjs v8+.
 * Kept separate from sentry.client.config.ts (which it reuses) so there is one
 * init definition shared by both entry points.
 */
import "./sentry.client.config";
