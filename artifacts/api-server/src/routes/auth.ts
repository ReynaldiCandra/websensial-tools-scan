import { Router } from "express";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  createSessionToken,
  isLoginConfigured,
  verifyPassword,
  verifySessionToken,
} from "../lib/session";
import { clientIp, rateLimit, sweepRateLimitBuckets } from "../lib/rate-limit";

const router = Router();

const LoginBody = z.object({
  password: z.string().min(1).max(200),
});

const LOGIN_ATTEMPTS = 6;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

router.post("/auth/login", (req, res) => {
  if (!isLoginConfigured()) {
    return res.status(503).json({
      error:
        "Login belum aktif. Set AUTH_PASSWORD (atau ADMIN_API_KEY) di environment, lalu redeploy.",
    });
  }

  const ip = clientIp(req);
  sweepRateLimitBuckets();
  const limit = rateLimit(`login:${ip}`, LOGIN_ATTEMPTS, LOGIN_WINDOW_MS);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({
      error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfterSeconds} detik.`,
    });
  }

  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Password wajib diisi." });
  }

  if (!verifyPassword(parsed.data.password)) {
    return res.status(401).json({ error: "Password salah." });
  }

  res.cookie(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  });

  return res.json({ ok: true });
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return res.json({ ok: true });
});

/** Dipakai halaman login untuk tahu apakah sesi masih berlaku. */
router.get("/auth/session", (req, res) => {
  return res.json({
    authenticated: verifySessionToken(req.cookies?.[SESSION_COOKIE]),
    loginConfigured: isLoginConfigured(),
  });
});

export default router;
