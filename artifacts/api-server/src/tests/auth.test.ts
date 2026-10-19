import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";

const API_KEY = "test-api-key";
const PASSWORD = "rahasia-sekali";

let app!: Express;

before(async () => {
  // Auth must work without a database.
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "production";
  process.env.LOG_LEVEL = "silent";
  process.env.ADMIN_API_KEY = API_KEY;
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.AUTH_PASSWORD = PASSWORD;

  ({ default: app } = await import("../app"));
});

afterEach(() => {
  process.env.AUTH_PASSWORD = PASSWORD;
  process.env.ADMIN_API_KEY = API_KEY;
});

describe("auth", () => {
  it("rejects a wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "salah" });

    assert.equal(res.status, 401);
    assert.equal(res.headers["set-cookie"], undefined);
  });

  it("issues an httpOnly session cookie that unlocks protected routes", async () => {
    const login = await request(app).post("/api/auth/login").send({ password: PASSWORD });

    assert.equal(login.status, 200);
    const setCookie = String(login.headers["set-cookie"]?.[0] ?? "");
    assert.match(setCookie, /^ws_session=/);
    assert.match(setCookie, /HttpOnly/i);

    const cookie = setCookie.split(";")[0];

    const protectedRes = await request(app)
      .get("/api/prospecting/categories")
      .set("Cookie", cookie);
    assert.equal(protectedRes.status, 200);
    assert.ok(Array.isArray(protectedRes.body));

    const session = await request(app).get("/api/auth/session").set("Cookie", cookie);
    assert.equal(session.status, 200);
    assert.equal(session.body.authenticated, true);
  });

  it("keeps the API key accepted for scripts and tests", async () => {
    const res = await request(app)
      .get("/api/prospecting/categories")
      .set("x-api-key", API_KEY);

    assert.equal(res.status, 200);
  });

  it("rejects a tampered session cookie", async () => {
    const res = await request(app)
      .get("/api/prospecting/categories")
      .set("Cookie", "ws_session=9999999999999.forged-signature");

    assert.equal(res.status, 401);
  });

  it("blocks requests without a session or key", async () => {
    const res = await request(app).get("/api/prospecting/categories");

    assert.equal(res.status, 401);
  });

  it("reports loginConfigured=false when no password is configured", async () => {
    delete process.env.AUTH_PASSWORD;
    delete process.env.ADMIN_API_KEY;

    const res = await request(app).get("/api/auth/session");

    assert.equal(res.status, 200);
    assert.equal(res.body.loginConfigured, false);
    assert.equal(res.body.authenticated, false);
  });

  it("limits repeated login attempts", async () => {
    let blocked = false;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ password: "salah-terus" });

      if (res.status === 429) {
        blocked = true;
        break;
      }
    }

    assert.equal(blocked, true);
  });
});
