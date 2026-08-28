import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock process.env before importing config
const mockEnv = {
  RATE_LIMIT_WINDOW_MS: "120000",
  RATE_LIMIT_MAX_REQUESTS: "120",
  AUTH_RATE_LIMIT_MAX: "20",
  AUTH_RATE_LIMIT_WINDOW_MS: "1800000",
  UPLOAD_RATE_LIMIT_MAX: "20",
  UPLOAD_RATE_LIMIT_WINDOW_MS: "120000",
  SEARCH_RATE_LIMIT_MAX: "60",
  SEARCH_RATE_LIMIT_WINDOW_MS: "120000",
  VIEW_ALBUM_RATE_LIMIT_MAX: "60",
  VIEW_ALBUM_RATE_LIMIT_WINDOW_MS: "120000",
  RESPOND_BOOKING_RATE_LIMIT_MAX: "40",
  RESPOND_BOOKING_RATE_LIMIT_WINDOW_MS: "120000",
  CANCEL_BOOKING_RATE_LIMIT_MAX: "20",
  CANCEL_BOOKING_RATE_LIMIT_WINDOW_MS: "120000",
  SEARCH_MIN_QUERY_LENGTH: "3",
  SEARCH_DEFAULT_LIMIT: "40",
  SEARCH_MAX_LIMIT: "200",
  FETCH_TIMEOUT_MS: "60000",
  TUTORIAL_MEASURE_DELAY_1_MS: "240",
  TUTORIAL_MEASURE_DELAY_2_MS: "1300",
  TUTORIAL_REMEASURE_INTERVAL_MS: "6000",
  SPLASH_SCREEN_DURATION_MS: "6000",
  TUTORIAL_TOOLTIP_MOVE_DELAY_MS: "6000",
  RECONNECT_DELAYS_MS: "2000,4000,10000,20000,40000,60000",
  GEOLOCATION_TIMEOUT_MS: "16000",
  GEOLOCATION_MAX_AGE_MS: "1200000",
  MAX_FILE_SIZE_MB: "20",
  REKOGNITION_MIN_CONFIDENCE: "75",
  VIDEO_MODERATION_MIN_CONFIDENCE: "75",
  TUTORIAL_TOOLTIP_WIDTH: "300",
  TUTORIAL_TOOLTIP_MARGIN: "24",
  TUTORIAL_RESERVED_HEIGHT: "520",
  TUTORIAL_HIGHLIGHT_RADIUS_MAX: "44",
  MAX_TEXT_LENGTH: "4000",
  AI_EMBED_MAX_CHARS: "16000",
  AI_MODERATION_MAX_CHARS: "3000",
  MODERATION_MIN_CONFIDENCE: "75",
  PUSH_TTL_SECONDS: "172800",
  STATE_SYNC_INTERVAL_MS: "60000",
};

describe("config", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, mockEnv);
  });

  it("should parse rate limit config from env", async () => {
    const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = await import("./config");
    expect(RATE_LIMIT_WINDOW_MS).toBe(120000);
    expect(RATE_LIMIT_MAX_REQUESTS).toBe(120);
  }, 10000);

  it("should parse auth rate limit config from env", async () => {
    const { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } = await import("./config");
    expect(AUTH_RATE_LIMIT_MAX).toBe(20);
    expect(AUTH_RATE_LIMIT_WINDOW_MS).toBe(1800000);
  });

  it("should parse upload rate limit config from env", async () => {
    const { UPLOAD_RATE_LIMIT_MAX, UPLOAD_RATE_LIMIT_WINDOW_MS } = await import("./config");
    expect(UPLOAD_RATE_LIMIT_MAX).toBe(20);
    expect(UPLOAD_RATE_LIMIT_WINDOW_MS).toBe(120000);
  });

  it("should parse search rate limit config from env", async () => {
    const { SEARCH_RATE_LIMIT_MAX, SEARCH_RATE_LIMIT_WINDOW_MS } = await import("./config");
    expect(SEARCH_RATE_LIMIT_MAX).toBe(60);
    expect(SEARCH_RATE_LIMIT_WINDOW_MS).toBe(120000);
  });

  it("should parse view album rate limit config from env", async () => {
    const { VIEW_ALBUM_RATE_LIMIT_MAX, VIEW_ALBUM_RATE_LIMIT_WINDOW_MS } = await import("./config");
    expect(VIEW_ALBUM_RATE_LIMIT_MAX).toBe(60);
    expect(VIEW_ALBUM_RATE_LIMIT_WINDOW_MS).toBe(120000);
  });

  it("should parse respond booking rate limit config from env", async () => {
    const { RESPOND_BOOKING_RATE_LIMIT_MAX, RESPOND_BOOKING_RATE_LIMIT_WINDOW_MS } = await import("./config");
    expect(RESPOND_BOOKING_RATE_LIMIT_MAX).toBe(40);
    expect(RESPOND_BOOKING_RATE_LIMIT_WINDOW_MS).toBe(120000);
  });

  it("should parse cancel booking rate limit config from env", async () => {
    const { CANCEL_BOOKING_RATE_LIMIT_MAX, CANCEL_BOOKING_RATE_LIMIT_WINDOW_MS } = await import("./config");
    expect(CANCEL_BOOKING_RATE_LIMIT_MAX).toBe(20);
    expect(CANCEL_BOOKING_RATE_LIMIT_WINDOW_MS).toBe(120000);
  });

  it("should parse search config from env", async () => {
    const { SEARCH_MIN_QUERY_LENGTH, SEARCH_DEFAULT_LIMIT, SEARCH_MAX_LIMIT } = await import("./config");
    expect(SEARCH_MIN_QUERY_LENGTH).toBe(3);
    expect(SEARCH_DEFAULT_LIMIT).toBe(40);
    expect(SEARCH_MAX_LIMIT).toBe(200);
  });

  it("should parse timeout config from env", async () => {
    const { FETCH_TIMEOUT_MS } = await import("./config");
    expect(FETCH_TIMEOUT_MS).toBe(60000);
  });

  it("should parse tutorial config from env", async () => {
    const {
      TUTORIAL_MEASURE_DELAY_1_MS,
      TUTORIAL_MEASURE_DELAY_2_MS,
      TUTORIAL_REMEASURE_INTERVAL_MS,
      SPLASH_SCREEN_DURATION_MS,
      TUTORIAL_TOOLTIP_MOVE_DELAY_MS,
    } = await import("./config");
    expect(TUTORIAL_MEASURE_DELAY_1_MS).toBe(240);
    expect(TUTORIAL_MEASURE_DELAY_2_MS).toBe(1300);
    expect(TUTORIAL_REMEASURE_INTERVAL_MS).toBe(6000);
    expect(SPLASH_SCREEN_DURATION_MS).toBe(6000);
    expect(TUTORIAL_TOOLTIP_MOVE_DELAY_MS).toBe(6000);
  });

  it("should parse reconnect delays from env", async () => {
    const { RECONNECT_DELAYS_MS } = await import("./config");
    expect(RECONNECT_DELAYS_MS).toEqual([2000, 4000, 10000, 20000, 40000, 60000]);
  });

  it("should parse geolocation config from env", async () => {
    const { GEOLOCATION_TIMEOUT_MS, GEOLOCATION_MAX_AGE_MS } = await import("./config");
    expect(GEOLOCATION_TIMEOUT_MS).toBe(16000);
    expect(GEOLOCATION_MAX_AGE_MS).toBe(1200000);
  });

  it("should parse file upload config from env", async () => {
    const { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } = await import("./config");
    expect(MAX_FILE_SIZE_MB).toBe(20);
    expect(MAX_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024);
  });

  it("should parse moderation config from env", async () => {
    const { REKOGNITION_MIN_CONFIDENCE, VIDEO_MODERATION_MIN_CONFIDENCE, MODERATION_MIN_CONFIDENCE } = await import("./config");
    expect(REKOGNITION_MIN_CONFIDENCE).toBe(75);
    expect(VIDEO_MODERATION_MIN_CONFIDENCE).toBe(75);
    expect(MODERATION_MIN_CONFIDENCE).toBe(75);
  });

  it("should parse tutorial overlay config from env", async () => {
    const {
      TUTORIAL_TOOLTIP_WIDTH,
      TUTORIAL_TOOLTIP_MARGIN,
      TUTORIAL_RESERVED_HEIGHT,
      TUTORIAL_HIGHLIGHT_RADIUS_MAX,
    } = await import("./config");
    expect(TUTORIAL_TOOLTIP_WIDTH).toBe(300);
    expect(TUTORIAL_TOOLTIP_MARGIN).toBe(24);
    expect(TUTORIAL_RESERVED_HEIGHT).toBe(520);
    expect(TUTORIAL_HIGHLIGHT_RADIUS_MAX).toBe(44);
  });

  it("should parse content safety config from env", async () => {
    const { MAX_TEXT_LENGTH, AI_EMBED_MAX_CHARS, AI_MODERATION_MAX_CHARS, MODERATION_MIN_CONFIDENCE } = await import("./config");
    expect(MAX_TEXT_LENGTH).toBe(4000);
    expect(AI_EMBED_MAX_CHARS).toBe(16000);
    expect(AI_MODERATION_MAX_CHARS).toBe(3000);
    expect(MODERATION_MIN_CONFIDENCE).toBe(75);
  });

  it("should parse push notification config from env", async () => {
    const { PUSH_TTL_SECONDS } = await import("./config");
    expect(PUSH_TTL_SECONDS).toBe(172800);
  });

  it("should parse sync config from env", async () => {
    const { STATE_SYNC_INTERVAL_MS } = await import("./config");
    expect(STATE_SYNC_INTERVAL_MS).toBe(60000);
  });

  it("should use defaults when env vars not set", async () => {
    vi.resetModules();
    // Clear all mock env vars
    const keysToDelete = Object.keys(mockEnv);
    keysToDelete.forEach(key => delete process.env[key]);
    const config = await import("./config");
    expect(config.RATE_LIMIT_WINDOW_MS).toBe(60000);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(60);
    expect(config.AUTH_RATE_LIMIT_MAX).toBe(10);
    expect(config.AUTH_RATE_LIMIT_WINDOW_MS).toBe(900000);
  });

  it("should parse RECONNECT_DELAYS_MS as array of numbers", async () => {
    const { RECONNECT_DELAYS_MS } = await import("./config");
    expect(Array.isArray(RECONNECT_DELAYS_MS)).toBe(true);
    expect(RECONNECT_DELAYS_MS.every(n => typeof n === "number")).toBe(true);
  });

  it("should parse MAX_FILE_SIZE_BYTES correctly", async () => {
    const { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } = await import("./config");
    expect(MAX_FILE_SIZE_BYTES).toBe(MAX_FILE_SIZE_MB * 1024 * 1024);
  });
});