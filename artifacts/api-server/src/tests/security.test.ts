import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";

const API_KEY = "test-api-key";
const ALLOWED_ORIGIN = "https://dashboard.example.com";

let app!: Express;
let escapeHtml!: (value: string) => string;
let clientIp!: (req: unknown) => string;
let allowLandingCopyGeneration!: (ip: string) => { allowed: boolean; retryAfterSeconds: number };

before(async () => {
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "production";
  process.env.LOG_LEVEL = "silent";
  process.env.ADMIN_API_KEY = API_KEY;
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.CORS_ORIGINS = ALLOWED_ORIGIN;

  ({ default: app } = await import("../app"));
  ({ escapeHtml } = await import("../routes/previews"));
  ({ clientIp } = await import("../lib/rate-limit"));
  ({ allowLandingCopyGeneration } = await import("../lib/landing-copy-limit"));
});

describe("preview HTML escaping", () => {
  it("neutralises markup and attribute-breaking characters", () => {
    const escaped = escapeHtml(`<script>alert("x")</script>' onerror='`);

    assert.equal(
      escaped,
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&#39; onerror=&#39;",
    );
    assert.equal(escaped.includes("<"), false);
    assert.equal(escaped.includes(">"), false);
  });
});

describe("security headers", () => {
  it("sets hardening headers on API responses", async () => {
    const res = await request(app).get("/api/healthz");

    assert.equal(res.status, 200);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");
    assert.equal(res.headers["referrer-policy"], "strict-origin-when-cross-origin");
    assert.equal(res.headers["permissions-policy"], "camera=(), microphone=(), geolocation=()");
    assert.equal(res.headers["content-security-policy"], "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    assert.equal(res.headers["strict-transport-security"], "max-age=63072000");
    assert.equal(res.headers["cache-control"], "no-store");
    assert.equal(res.headers["x-powered-by"], undefined);
  });
});

describe("security header environment", () => {
  it("does not send HSTS when the API is running outside production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    try {
      const res = await request(app).get("/api/healthz");
      assert.equal(res.status, 200);
      assert.equal(res.headers["strict-transport-security"], undefined);
      assert.ok(res.headers["content-security-policy"]);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

describe("CORS", () => {
  it("does not grant credentialed access to unknown origins", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set("Origin", "https://evil.example.com");

    assert.equal(res.status, 200);
    assert.equal(res.headers["access-control-allow-origin"], undefined);
    assert.equal(res.headers["access-control-allow-credentials"], undefined);
  });

  it("allows the configured dashboard origin", async () => {
    const res = await request(app).get("/api/healthz").set("Origin", ALLOWED_ORIGIN);

    assert.equal(res.headers["access-control-allow-origin"], ALLOWED_ORIGIN);
    assert.equal(res.headers["access-control-allow-credentials"], "true");
  });
});

describe("clientIp", () => {
  const fakeReq = (headers: Record<string, string>) =>
    ({
      header(name: string) {
        return headers[name.toLowerCase()];
      },
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    }) as unknown as Parameters<typeof clientIp>[0];

  it("ignores a spoofed left-most x-forwarded-for entry", () => {
    // The caller prepends 1.2.3.4; the proxy appended the real address.
    assert.equal(clientIp(fakeReq({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" })), "203.0.113.9");
  });

  it("prefers x-real-ip when the platform provides it", () => {
    assert.equal(
      clientIp(fakeReq({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.2.3.4" })),
      "203.0.113.9",
    );
  });

  it("falls back to the socket address", () => {
    assert.equal(clientIp(fakeReq({})), "127.0.0.1");
  });
});


describe("AI landing-copy usage limit", () => {
  it("allows five requests per hour for an IP, then returns a retry window", () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.deepEqual(allowLandingCopyGeneration(ip), { allowed: true, retryAfterSeconds: 0 });
    }
    const blocked = allowLandingCopyGeneration(ip);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 3600);
  });

  it("tracks another IP in a separate limit bucket", () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    assert.deepEqual(allowLandingCopyGeneration(ip), { allowed: true, retryAfterSeconds: 0 });
  });
});
