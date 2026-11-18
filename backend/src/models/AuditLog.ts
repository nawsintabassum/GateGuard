import mongoose, { Schema } from "mongoose";
const schema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  actor: { type: Schema.Types.ObjectId, ref: "User" },
  actorLabel: { type: String, required: true, maxlength: 120 },
  action: { type: String, required: true, maxlength: 100 },
  details: { type: String, required: true, maxlength: 1000 }
}, { timestamps: true });
schema.index({ project: 1, createdAt: -1 });
export const AuditLog = mongoose.model("AuditLog", schema);
