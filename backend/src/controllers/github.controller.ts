
import { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../config/env";
import {
  exchangeCode,
  listRepositories
} from "../services/github.service";
import { User } from "../models/User";
import { githubOAuthCallback } from "./oauth.controller";
import {
  encrypt,
  randomToken,
  sha256
} from "../utils/crypto";

// ============================================
// GitHub OAuth - Connect
// ============================================

export async function connectStart(req: Request, res: Response) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CALLBACK_URL) {
    return res.status(503).json({
      message: "GitHub OAuth is not configured"
    });
  }

  const state = randomToken();

  await User.findByIdAndUpdate(req.user!.id, {
    githubOAuthStateHash: sha256(state),
    githubOAuthStateExpires: new Date(Date.now() + 10 * 60 * 1000)
  });

  const url = new URL(
    "https://github.com/login/oauth/authorize"
  );

  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL);
  url.searchParams.set("scope", "read:user user:email repo");
  url.searchParams.set("state", state);

  return res.json({
    authorizationUrl: url.toString()
  });
}

// ============================================
// GitHub OAuth - Callback
// ============================================

export async function callback(req: Request, res: Response) {
  if (typeof req.cookies?.oauth_state === "string") {
    return githubOAuthCallback(req, res);
  }

  const { code, state } = req.query;

  const clientUrl = env.CLIENT_URL
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");

  try {
    if (typeof code !== "string" || typeof state !== "string") {
      throw new Error("Missing OAuth code or state");
    }

    const stateHash = sha256(state);

    const user = await User.findOneAndUpdate(
      {
        githubOAuthStateHash: stateHash,
        githubOAuthStateExpires: {
          $gt: new Date()
        }
      },
      {
        $unset: {
          githubOAuthStateHash: 1,
          githubOAuthStateExpires: 1
        }
      },
      {
        new: true
      }
    );

    if (!user) {
      throw new Error("OAuth state is invalid, expired, or already used");
    }

    const token = await exchangeCode(code);

    const axios = (await import("axios")).default;

    const { data } = await axios.get(
      "https://api.github.com/user",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    await User.findByIdAndUpdate(user._id, {
      githubId: String(data.id),
      githubUsername: data.login,
      githubTokenEncrypted: encrypt(token)
    });

    return res.redirect(
      `${clientUrl}/app/settings?github=connected`
    );

  } catch (error) {
    console.error("GitHub OAuth callback error:", error);

    return res.redirect(
      `${clientUrl}/app/settings?github=error`
    );
  }
}

// ============================================
// GitHub Repositories
// ============================================

export async function repositories(req: Request, res: Response) {
  const repos = await listRepositories(req.user!.id);

  return res.json({
    repositories: repos
  });
}

// ============================================
// GitHub Disconnect
// ============================================

export async function disconnect(req: Request, res: Response) {
  await User.findByIdAndUpdate(req.user!.id, {
    $unset: {
      githubId: 1,
      githubUsername: 1,
      githubTokenEncrypted: 1
    }
  });

  return res.json({
    message: "GitHub disconnected"
  });
}

// ============================================
// GitHub Webhook - Signature Verification
// ============================================

export async function githubWebhook(req: Request, res: Response) {
  try {
    const secret = env.GITHUB_WEBHOOK_SECRET;

    if (!secret || !secret.trim()) {
      return res.status(503).json({
        success: false,
        message: "GitHub Webhook is not configured"
      });
    }

    // Raw request body is required for signature verification
    if (!Buffer.isBuffer(req.body)) {
      console.error("Webhook body is not a raw Buffer");

      return res.status(400).json({
        success: false,
        message: "Invalid webhook payload. Raw body required."
      });
    }

    const signature = req.get("x-hub-signature-256");

    if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature"
      });
    }

    const expectedSignature = createHmac("sha256", secret.trim())
      .update(req.body)
      .digest();

    const receivedSignature = Buffer.from(
      signature.slice(7),
      "hex"
    );

    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      return res.status(401).json({
        success: false,
        message: "Webhook signature verification failed"
      });
    }

    const event = req.get("x-github-event");
    const deliveryId = req.get("x-github-delivery");

    if (!event || !deliveryId) {
      return res.status(400).json({
        success: false,
        message: "Missing GitHub event headers"
      });
    }

    let payload: any;

    try {
      payload = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON payload"
      });
    }

    // GitHub Ping
    if (event === "ping") {
      console.log("GitHub Webhook Ping received:", deliveryId);

      return res.status(200).json({
        success: true,
        message: "GitHub webhook connection successful"
      });
    }

    // Push Event
    if (event === "push") {
      console.log("GitHub Push Event:", deliveryId);

      // TODO: Connect GateGuard security analysis service
    }

    // Pull Request Event
    else if (event === "pull_request") {
      console.log("GitHub Pull Request Event:", deliveryId);

      // TODO: Connect GateGuard security analysis service
    }

    // Unsupported Event
    else {
      return res.status(200).json({
        success: true,
        message: "Event ignored",
        event
      });
    }

    return res.status(202).json({
      success: true,
      message: "GitHub webhook event received",
      event,
      deliveryId,
      repository: payload.repository?.full_name
    });

  } catch (error) {
    console.error("GitHub Webhook Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal webhook processing error"
    });
  }
}
