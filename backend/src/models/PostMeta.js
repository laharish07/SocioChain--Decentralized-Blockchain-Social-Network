const mongoose = require("mongoose");

const postMetaSchema = new mongoose.Schema({
  postId:        { type: Number, default: 0 },   // on-chain ID
  txHash:        { type: String, default: "" },
  ipfsHash:      { type: String, required: true },
  authorAddress: { type: String, required: true, lowercase: true },
  authorMeta:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  postType:      { type: String, enum: ["POST","COMMENT","REPOST"], default: "POST" },
  parentId:      { type: String, default: null },
  tags:          [String],
  preview:       { type: String, default: "" },
  likes:         { type: Number, default: 0 },
  reposts:       { type: Number, default: 0 },
  commentCount:  { type: Number, default: 0 },
  flagCount:     { type: Number, default: 0 },
  isDeleted:     { type: Boolean, default: false },
  createdAt:     { type: Date, default: Date.now },
});

postMetaSchema.index({ authorAddress: 1, createdAt: -1 });
postMetaSchema.index({ tags: 1 });
postMetaSchema.index({ postId: 1 });

module.exports = mongoose.model("PostMeta", postMetaSchema);
