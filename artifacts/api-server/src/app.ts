import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { publicPreviewsRouter } from "./routes/previews";
import { logger } from "./lib/logger";

const app: Express = express();

app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    // Serverless cold starts must never crash on pino worker threads:
    // fall back to sync transport-free logging if workers fail to spawn.
    autoLogging: false,
    quietReqLogger: true,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
/**
 * CORS: the dashboard is served from the same origin as this API, so no
 * browser client needs cross-origin access. `cors({ credentials: true })`
 * without an origin check reflected every caller's origin, which would let any
 * website read authenticated CRM responses. Only origins listed in
 * `CORS_ORIGINS` (comma separated) are granted.
 */
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);

// Baseline hardening headers. The public preview pages add their own
// Content-Security-Policy in routes/previews.ts.
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=63072000");
  }
  // CRM data must not be cached by the browser or an intermediary.
  if (!/^\/(api\/)?preview\//.test(req.path)) {
    res.setHeader("Cache-Control", "no-store");
  }
  next();
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Raw CSV bodies (Content-Type: text/csv) arrive as strings for bulk import.
app.use(express.text({ type: "text/csv", limit: "5mb" }));

/**
 * Public prospect demo links are shared as `/preview/<token>` (no `/api`
 * prefix) — the Vercel rewrite for `/preview/*` lands in this function, so the
 * root path has to be served here as well. Without this mount the share link
 * returns the JSON 404 "Route not found" instead of the generated website.
 */
app.use(publicPreviewsRouter);
app.use("/api", router);

// Never let Express fall back to its HTML error page: the frontend always
// expects JSON, and an HTML body is what produced the confusing
// "Unexpected token '<' ... is not valid JSON" message in the UI.
app.use((_req: Request, res: Response) => {
  return res.status(404).json({ error: "Route not found" });
});

app.use(
  (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);

    logger.error({ err }, "Unhandled API error");
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({
      error: "Internal server error",
      detail: process.env.NODE_ENV === "production" ? undefined : message,
    });
  },
);

export default app;
