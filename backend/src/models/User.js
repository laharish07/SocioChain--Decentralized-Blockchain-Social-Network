const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  address:    { type: String, required: true, unique: true, lowercase: true },
  nonce:      { type: String, default: () => Math.floor(Math.random() * 1_000_000).toString() },
  username:   { type: String, default: "" },
  bio:        { type: String, default: "" },
  avatar:     { type: String, default: "" },
  website:    { type: String, default: "" },
  publicKey:  { type: String, default: "" }, // for E2E encrypted DMs
  verified:   { type: Boolean, default: false },
  following:  [{ type: String, lowercase: true }],
  followers:  [{ type: String, lowercase: true }],
  lastLogin:  { type: Date },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
});

userSchema.index({ address: 1 });
userSchema.index({ username: "text" });

module.exports = mongoose.model("User", userSchema);
