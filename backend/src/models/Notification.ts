import mongoose, { Schema } from "mongoose";
const schema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: "Project" },
  type: { type: String, enum: ["quality_gate", "security", "coverage", "analysis", "pull_request", "team"], required: true },
  title: { type: String, required: true, maxlength: 180 },
  message: { type: String, required: true, maxlength: 1000 },
  severity: { type: String, enum: ["info", "success", "warning", "critical"], default: "info" },
  readAt: Date,
  link: String
}, { timestamps: true });
schema.index({ owner: 1, createdAt: -1 });
export const Notification = mongoose.model("Notification", schema);
