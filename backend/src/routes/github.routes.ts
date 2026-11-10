
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

import {
  connectStart,
  callback,
  repositories,
  disconnect,
  githubWebhook
} from "../controllers/github.controller";

const router = Router();

// GitHub Webhook
// Must be accessible without user JWT authentication
router.post("/webhook", asyncHandler(githubWebhook));

// GitHub OAuth Callback
router.get("/callback", asyncHandler(callback));

// Authentication required for remaining routes
router.use(requireAuth);

// GitHub OAuth Connect
router.get("/connect", asyncHandler(connectStart));

// List connected GitHub repositories
router.get("/repositories", asyncHandler(repositories));

// Disconnect GitHub account
router.delete("/disconnect", asyncHandler(disconnect));

export default router;
