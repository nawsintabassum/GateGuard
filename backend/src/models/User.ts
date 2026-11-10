import mongoose, { Schema } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  githubId?: string;
  githubUsername?: string;
  githubTokenEncrypted?: string;
  googleId?: string;
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  githubOAuthStateHash?: string;
  githubOAuthStateExpires?: Date;
  oauthLoginCodeHash?: string;
  oauthLoginCodeExpires?: Date;
  tokenVersion: number;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  githubId: String,
  githubUsername: String,
  githubTokenEncrypted: { type: String, select: false },
  googleId: String,
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: Date,
  githubOAuthStateHash: { type: String, select: false },
  githubOAuthStateExpires: Date,
  oauthLoginCodeHash: { type: String, select: false },
  oauthLoginCodeExpires: Date,
  tokenVersion: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export const User = mongoose.model<IUser>("User", UserSchema);
