/** Auth client facade: re-exports getAccessToken and authFetch from ./api as the app's auth-aware fetch entry point. */
"use client";

// Centralized auth helpers — single implementation lives in ./api.
export { getAccessToken, authFetch } from "./api";
