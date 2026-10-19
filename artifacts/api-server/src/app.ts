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
app.use(cors({ credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Raw CSV bodies (Content-Type: text/csv) arrive as strings for bulk import.
app.use(express.text({ type: "text/csv", limit: "5mb" }));

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
