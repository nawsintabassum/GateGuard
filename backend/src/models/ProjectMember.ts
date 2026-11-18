import mongoose, { Schema } from "mongoose";
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ["admin", "manager", "developer", "viewer"], default: "viewer" },
  status: { type: String, enum: ["invited", "active"], default: "invited" },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
schema.index({ project: 1, email: 1 }, { unique: true });
schema.index({ user: 1, status: 1 });
export const ProjectMember = mongoose.model("ProjectMember", schema);
