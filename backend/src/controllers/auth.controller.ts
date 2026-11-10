
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { User } from "../models/User";
import { signAccessToken } from "../utils/jwt";
import { randomToken, sha256 } from "../utils/crypto";
import { env } from "../config/env";

// ============================================
// Validation Schemas
// ============================================

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must not exceed 72 characters")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes"
  );

const emailSchema = z
  .email()
  .trim()
  .toLowerCase();

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must not exceed 80 characters");

const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .max(72, "Password is too long")
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= 72,
      "Password must not exceed 72 UTF-8 bytes"
    ),
});

const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1)
    .max(72)
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= 72
    ),
  newPassword: passwordSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

// ============================================
// Safe User Response
// ============================================

type SafeUserInput = {
  _id: { toString(): string };
  name: string;
  email: string;
  githubId?: string | null;
  githubUsername?: string | null;
};

const safeUser = (user: SafeUserInput) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  githubConnected: Boolean(user.githubId),
  githubUsername: user.githubUsername ?? null,
});

// ============================================
// Register
// ============================================

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);

  const existingUser = await User.findOne({
    email: input.email,
  });

  if (existingUser) {
    return res.status(409).json({
      message: "An account with this email already exists",
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  const token = signAccessToken({
    id: String(user._id),
    email: user.email,
    tokenVersion: user.tokenVersion,
  });

  return res.status(201).json({
    token,
    user: safeUser(user),
  });
}

// ============================================
// Login
// ============================================

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  const user = await User.findOne({
    email: input.email,
  }).select("+passwordHash");

  if (
    !user ||
    !(await bcrypt.compare(input.password, user.passwordHash))
  ) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const token = signAccessToken({
    id: String(user._id),
    email: user.email,
    tokenVersion: user.tokenVersion,
  });

  return res.status(200).json({
    token,
    user: safeUser(user),
  });
}

// ============================================
// Get Current User
// ============================================

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  return res.status(200).json({
    user: safeUser(user),
  });
}

// ============================================
// Update Profile
// ============================================

export async function updateProfile(req: Request, res: Response) {
  const input = profileSchema.parse(req.body);

  const duplicate = await User.findOne({
    email: input.email,
    _id: { $ne: req.user!.id },
  });

  if (duplicate) {
    return res.status(409).json({
      message: "That email address is already in use",
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user!.id,
    {
      $set: {
        name: input.name,
        email: input.email,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  return res.status(200).json({
    user: safeUser(user),
  });
}

// ============================================
// Change Password
// ============================================

export async function changePassword(req: Request, res: Response) {
  const input = changePasswordSchema.parse(req.body);

  const user = await User.findById(req.user!.id).select(
    "+passwordHash"
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const passwordMatches = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash
  );

  if (!passwordMatches) {
    return res.status(400).json({
      message: "Current password is incorrect",
    });
  }

  if (input.currentPassword === input.newPassword) {
    return res.status(400).json({
      message: "New password must be different from current password",
    });
  }

  user.passwordHash = await bcrypt.hash(input.newPassword, 12);

  // Invalidate existing access tokens
  user.tokenVersion += 1;

  await user.save();

  return res.status(200).json({
    message: "Password changed successfully. Please sign in again.",
  });
}

// ============================================
// Forgot Password
// ============================================

export async function forgotPassword(req: Request, res: Response) {
  if (env.NODE_ENV === "production") {
    return res.status(503).json({
      message:
        "Password reset email delivery is not configured. Contact the administrator.",
    });
  }

  const email = emailSchema.parse(req.body.email);

  const user = await User.findOne({ email });

  const response: {
    message: string;
    devResetToken?: string;
  } = {
    message:
      "If the account exists, a development reset token has been generated.",
  };

  if (!user) {
    return res.status(200).json(response);
  }

  const token = randomToken();

  user.resetTokenHash = sha256(token);

  user.resetTokenExpires = new Date(
    Date.now() + 30 * 60 * 1000
  );

  await user.save();

  response.message =
    "Development password reset token created. Email delivery is not enabled.";

  response.devResetToken = token;

  return res.status(200).json(response);
}

// ============================================
// Reset Password
// ============================================

export async function resetPassword(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);

  const user = await User.findOne({
    resetTokenHash: sha256(input.token),
    resetTokenExpires: {
      $gt: new Date(),
    },
  }).select("+resetTokenHash");

  if (!user) {
    return res.status(400).json({
      message: "Reset token is invalid or expired",
    });
  }

  user.passwordHash = await bcrypt.hash(input.password, 12);

  // Invalidate all existing sessions
  user.tokenVersion += 1;

  // Remove used reset token
  user.set("resetTokenHash", undefined);
  user.set("resetTokenExpires", undefined);

  await user.save();

  return res.status(200).json({
    message: "Password updated successfully. Please sign in again.",
  });
}
