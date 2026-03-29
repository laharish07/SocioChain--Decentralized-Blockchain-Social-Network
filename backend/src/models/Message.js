const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  fromAddress:      { type: String, required: true, lowercase: true },
  toAddress:        { type: String, required: true, lowercase: true },
  encryptedContent: { type: String, required: true }, // AES-256 encrypted
  publicKeyUsed:    { type: String, default: "" },
  read:             { type: Boolean, default: false },
  createdAt:        { type: Date, default: Date.now },
});

messageSchema.index({ fromAddress: 1, toAddress: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
