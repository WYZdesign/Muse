import { describe, expect, it, vi } from "vitest";
import { jsonError, safeServerError } from "@/lib/http";

describe("http helpers", () => {
  it("jsonError builds a JSON error response with the given status", async () => {
    const res = jsonError("Nope", 404);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Nope" });
  });

  it("safeServerError returns a generic 500 and does not leak the underlying error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = safeServerError(new Error("secret detail"), "unit-ctx");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Server error" });
    expect(JSON.stringify(body)).not.toContain("secret detail");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("safeServerError works without a context label", async () => {
    const res = safeServerError("boom");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Server error" });
  });
});
