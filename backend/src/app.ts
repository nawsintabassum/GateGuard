
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { requireAuth } from "./middleware/auth";

import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import analysisRoutes from "./routes/analysis.routes";
import rulesRoutes from "./routes/rules.routes";
import githubRoutes from "./routes/github.routes";
import reportRoutes from "./routes/report.routes";
import ciRoutes from "./routes/ci.routes";

import { notFound, errorHandler } from "./middleware/error";

const app = express();

app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL.split(",").map(v => v.trim()),
    credentials: true
  })
);

// ============================================
// GitHub Webhook Raw Body Middleware
// Must run before express.json()
// ============================================

app.use(
  "/api/github/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb"
  })
);

// ============================================
// Normal Request Body Parsers
// ============================================

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb"
  })
);

app.use(cookieParser());

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ============================================
// API Rate Limiting
// ============================================

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);

// ============================================
// Health Check
// ============================================

app.get("/api/health", (_req, res) => {
  const database =
    mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected";

  return res
    .status(database === "connected" ? 200 : 503)
    .json({
      status: database === "connected" ? "ok" : "degraded",
      database,
      service: "gateguard-api",
      timestamp: new Date().toISOString()
    });
});

// ============================================
// API Routes
// ============================================

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20
  }),
  authRoutes
);

app.use("/api/projects", requireAuth, projectRoutes);

app.use("/api/analyses", requireAuth, analysisRoutes);

app.use("/api/rules", requireAuth, rulesRoutes);

app.use("/api/github", githubRoutes);

app.use("/api/reports", requireAuth, reportRoutes);

app.use(
  "/api/ci",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false
  }),
  ciRoutes
);

// ============================================
// Error Handling
// ============================================

app.use(notFound);

app.use(errorHandler);

export default app;
