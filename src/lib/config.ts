// ════════════════════════════════════════════════════════════════════════
// MUSE Runtime Configuration — Centralized Config for All Tunables
// All values can be overridden via environment variables (see .env.example)
// ═══════════════════════════════════════════════════════════════════════

// Rate Limiting
export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 60;

// Auth Rate Limits
export const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;
export const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000; // 15 min

// Upload Rate Limits
export const UPLOAD_RATE_LIMIT_MAX = Number(process.env.UPLOAD_RATE_LIMIT_MAX) || 10;
export const UPLOAD_RATE_LIMIT_WINDOW_MS = Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS) || 60000;

// Search Rate Limits
export const SEARCH_RATE_LIMIT_MAX = Number(process.env.SEARCH_RATE_LIMIT_MAX) || 30;
export const SEARCH_RATE_LIMIT_WINDOW_MS = Number(process.env.SEARCH_RATE_LIMIT_WINDOW_MS) || 60000;

// View Album Rate Limits
export const VIEW_ALBUM_RATE_LIMIT_MAX = Number(process.env.VIEW_ALBUM_RATE_LIMIT_MAX) || 30;
export const VIEW_ALBUM_RATE_LIMIT_WINDOW_MS = Number(process.env.VIEW_ALBUM_RATE_LIMIT_WINDOW_MS) || 60000;

// Respond Booking Rate Limits
export const RESPOND_BOOKING_RATE_LIMIT_MAX = Number(process.env.RESPOND_BOOKING_RATE_LIMIT_MAX) || 20;
export const RESPOND_BOOKING_RATE_LIMIT_WINDOW_MS = Number(process.env.RESPOND_BOOKING_RATE_LIMIT_WINDOW_MS) || 60000;

// Cancel Booking Rate Limits
export const CANCEL_BOOKING_RATE_LIMIT_MAX = Number(process.env.CANCEL_BOOKING_RATE_LIMIT_MAX) || 10;
export const CANCEL_BOOKING_RATE_LIMIT_WINDOW_MS = Number(process.env.CANCEL_BOOKING_RATE_LIMIT_WINDOW_MS) || 60000;

// Search
export const SEARCH_MIN_QUERY_LENGTH = Number(process.env.SEARCH_MIN_QUERY_LENGTH) || 2;
export const SEARCH_DEFAULT_LIMIT = Number(process.env.SEARCH_DEFAULT_LIMIT) || 20;
export const SEARCH_MAX_LIMIT = Number(process.env.SEARCH_MAX_LIMIT) || 100;

// Timeouts (ms)
export const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 30000;
export const TUTORIAL_MEASURE_DELAY_1_MS = Number(process.env.TUTORIAL_MEASURE_DELAY_1_MS) || 120;
export const TUTORIAL_MEASURE_DELAY_2_MS = Number(process.env.TUTORIAL_MEASURE_DELAY_2_MS) || 650;
export const TUTORIAL_REMEASURE_INTERVAL_MS = Number(process.env.TUTORIAL_REMEASURE_INTERVAL_MS) || 3000;
export const SPLASH_SCREEN_DURATION_MS = Number(process.env.SPLASH_SCREEN_DURATION_MS) || 3000;
export const TUTORIAL_TOOLTIP_MOVE_DELAY_MS = Number(process.env.TUTORIAL_TOOLTIP_MOVE_DELAY_MS) || 3000;

// Reconnect
export const RECONNECT_DELAYS_MS = (process.env.RECONNECT_DELAYS_MS || "1000,2000,5000,10000,20000,30000")
  .split(",")
  .map(Number);

// Geolocation
export const GEOLOCATION_TIMEOUT_MS = Number(process.env.GEOLOCATION_TIMEOUT_MS) || 8000;
export const GEOLOCATION_MAX_AGE_MS = Number(process.env.GEOLOCATION_MAX_AGE_MS) || 600000;

// File Upload
export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Moderation
export const REKOGNITION_MIN_CONFIDENCE = Number(process.env.REKOGNITION_MIN_CONFIDENCE) || 50;
export const VIDEO_MODERATION_MIN_CONFIDENCE = Number(process.env.VIDEO_MODERATION_MIN_CONFIDENCE) || 50;

// Content Safety
export const MAX_TEXT_LENGTH = Number(process.env.MAX_TEXT_LENGTH) || 2000;
export const AI_EMBED_MAX_CHARS = Number(process.env.AI_EMBED_MAX_CHARS) || 8000;
export const AI_MODERATION_MAX_CHARS = Number(process.env.AI_MODERATION_MAX_CHARS) || 1500;

// Moderation Thresholds
export const MODERATION_MIN_CONFIDENCE = Number(process.env.MODERATION_MIN_CONFIDENCE) || 50;

// Push Notifications
export const PUSH_TTL_SECONDS = Number(process.env.PUSH_TTL_SECONDS) || 86400; // 24 hours

// Sync
export const STATE_SYNC_INTERVAL_MS = Number(process.env.STATE_SYNC_INTERVAL_MS) || 30000;