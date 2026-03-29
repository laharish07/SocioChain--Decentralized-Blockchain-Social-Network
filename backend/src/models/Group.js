const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  groupId:        { type: Number, default: 0 },
  txHash:         { type: String, default: "" },
  name:           { type: String, required: true },
  description:    { type: String, default: "" },
  avatar:         { type: String, default: "" },
  isPrivate:      { type: Boolean, default: false },
  creatorAddress: { type: String, required: true, lowercase: true },
  members:        [{ type: String, lowercase: true }],
  admins:         [{ type: String, lowercase: true }],
  memberCount:    { type: Number, default: 1 },
  createdAt:      { type: Date, default: Date.now },
});

groupSchema.index({ name: "text" });

module.exports = mongoose.model("Group", groupSchema);
