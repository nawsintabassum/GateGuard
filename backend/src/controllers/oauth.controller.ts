import type { Request, Response } from "express";
import axios from "axios";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { env } from "../config/env";
import { User } from "../models/User";
import { signAccessToken } from "../utils/jwt";
import { randomToken, sha256 } from "../utils/crypto";

const clientUrl = () => env.CLIENT_URL.split(",")[0].trim().replace(/\/$/, "");
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/api",
  maxAge: 10 * 60 * 1000,
};
function startOAuth(provider: "github" | "google") {
  return async (req: Request, res: Response) => {
    const state = randomToken();
    res.cookie("oauth_state", state, cookieOptions);

    const url = new URL(
      provider === "github"
        ? "https://github.com/login/oauth/authorize"
        : "https://accounts.google.com/o/oauth2/v2/auth"
    );

    if (provider === "github") {
      if (!env.GITHUB_CLIENT_ID) {
        return res.status(503).json({ message: "GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." });
      }
      url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      // GitHub OAuth Apps have one callback URL. Reuse the configured callback
      // used by the GitHub connection flow; github.routes dispatches by state cookie.
      url.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL || `http://localhost:${env.PORT}/api/github/callback`);
      url.searchParams.set("scope", "read:user user:email");
    } else {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ message: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
      }
      url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
      url.searchParams.set("redirect_uri", env.GOOGLE_CALLBACK_URL || `http://localhost:${env.PORT}/api/auth/oauth/google/callback`);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid email profile");
      url.searchParams.set("prompt", "select_account");
    }
    url.searchParams.set("state", state);
    return res.json({ authorizationUrl: url.toString() });
  };
}

async function completeOAuthLogin(
  res: Response,
  profile: { email: string; name: string; provider: "github" | "google"; providerId: string; githubUsername?: string }
) {
  let user = await User.findOne({ email: profile.email });
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

  if (!user) {
    user = await User.create({
      name: profile.name || profile.email.split("@")[0],
      email: profile.email,
      passwordHash,
      ...(profile.provider === "github"
        ? { githubId: profile.providerId, githubUsername: profile.githubUsername }
        : { googleId: profile.providerId }),
    });
  } else {
    if (profile.provider === "github") {
      if (user.githubId && user.githubId !== profile.providerId) {
        return res.redirect(`${clientUrl()}/auth/login?oauth_error=This+email+is+already+linked+to+another+GitHub+account`);
      }
      user.githubId = profile.providerId;
      user.githubUsername = profile.githubUsername;
    } else {
      if (user.googleId && user.googleId !== profile.providerId) {
        return res.redirect(`${clientUrl()}/auth/login?oauth_error=This+email+is+already+linked+to+another+Google+account`);
      }
      user.googleId = profile.providerId;
    }
    await user.save();
  }

  const code = randomToken();
  user.oauthLoginCodeHash = sha256(code);
  user.oauthLoginCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();
  return res.redirect(`${clientUrl()}/auth/oauth/callback?code=${encodeURIComponent(code)}`);
}

function validState(req: Request, res: Response, state: unknown) {
  const expected = req.cookies?.oauth_state;

  console.log("OAuth state diagnostic:", {
    cookiePresent: typeof expected === "string",
    queryStatePresent: typeof state === "string",
    stateMatches:
      typeof state === "string" &&
      typeof expected === "string" &&
      state === expected,
  });

  res.clearCookie("oauth_state", { ...cookieOptions, maxAge: undefined });

  return (
    typeof state === "string" &&
    typeof expected === "string" &&
    state === expected
  );
}
export const githubOAuthStart = startOAuth("github");
export const googleOAuthStart = startOAuth("google");

export async function githubOAuthCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;
    if (!validState(req, res, state) || typeof code !== "string" || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return res.redirect(`${clientUrl()}/auth/login?oauth_error=GitHub+authorization+failed`);
    }

    const tokenResponse = await axios.post("https://github.com/login/oauth/access_token", {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }, { headers: { Accept: "application/json" } });
    const accessToken = tokenResponse.data.access_token as string | undefined;
    if (!accessToken) throw new Error("GitHub did not return an access token");

    const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" };
    const { data: profile } = await axios.get("https://api.github.com/user", { headers });
    const { data: emails } = await axios.get("https://api.github.com/user/emails", { headers });
    const verifiedEmail = (emails as Array<{ email: string; verified: boolean; primary: boolean }>)
      .find((entry) => entry.verified && entry.primary)?.email
      || (emails as Array<{ email: string; verified: boolean }>).find((entry) => entry.verified)?.email;
    if (!verifiedEmail) throw new Error("A verified email address is required on GitHub");

    return completeOAuthLogin(res, {
      email: verifiedEmail.toLowerCase(),
      name: profile.name || profile.login,
      provider: "github",
      providerId: String(profile.id),
      githubUsername: profile.login,
    });
  } catch (error) {
    console.error("GitHub OAuth callback failed:", error);
    return res.redirect(`${clientUrl()}/auth/login?oauth_error=GitHub+sign-in+failed`);
  }
}

export async function googleOAuthCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;
    if (!validState(req, res, state) || typeof code !== "string" || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${clientUrl()}/auth/login?oauth_error=Google+authorization+failed`);
    }

    const redirectUri = env.GOOGLE_CALLBACK_URL || `http://localhost:${env.PORT}/api/auth/oauth/google/callback`;
    const body = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const { data: tokenData } = await axios.post("https://oauth2.googleapis.com/token", body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const { data: profile } = await axios.get("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profile.email || profile.email_verified !== true) throw new Error("A verified Google email is required");

    return completeOAuthLogin(res, {
      email: String(profile.email).toLowerCase(),
      name: profile.name || String(profile.email).split("@")[0],
      provider: "google",
      providerId: String(profile.sub),
    });
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return res.redirect(`${clientUrl()}/auth/login?oauth_error=Google+sign-in+failed`);
  }
}

export async function exchangeOAuthCode(req: Request, res: Response) {
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!code) return res.status(400).json({ message: "OAuth code is required" });

  const user = await User.findOneAndUpdate(
    { oauthLoginCodeHash: sha256(code), oauthLoginCodeExpires: { $gt: new Date() } },
    { $unset: { oauthLoginCodeHash: 1, oauthLoginCodeExpires: 1 } },
    { new: true },
  );
  if (!user) return res.status(401).json({ message: "OAuth sign-in code is invalid or expired" });

  const token = signAccessToken({ id: String(user._id), email: user.email, tokenVersion: user.tokenVersion });
  return res.json({
    token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      githubConnected: Boolean(user.githubId),
      githubUsername: user.githubUsername ?? null,
    },
  });
}
