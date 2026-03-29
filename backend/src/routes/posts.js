const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const PostMeta = require("../models/PostMeta");
const User     = require("../models/User");

/**
 * GET /api/posts/feed
 * Returns paginated feed for authenticated user (off-chain cache)
 */
router.get("/feed", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user.userId);
    const following = user.following || [];

    const posts = await PostMeta.find({
      $or: [
        { authorAddress: { $in: following } },
        { authorAddress: req.user.address },
      ],
      isDeleted: false,
      flagCount: { $lt: 10 },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("authorMeta", "username avatar address verified");

    res.json({ posts, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/posts/explore
 * Public explore feed
 */
router.get("/explore", async (req, res) => {
  try {
    const { page = 1, limit = 20, tag } = req.query;
    const query = { isDeleted: false, flagCount: { $lt: 10 }, postType: "POST" };
    if (tag) query.tags = tag;

    const posts = await PostMeta.find(query)
      .sort({ likes: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("authorMeta", "username avatar address verified");

    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/posts
 * Cache a post (after it's been written to blockchain)
 */
router.post("/", auth, async (req, res) => {
  try {
    const { txHash, postId, ipfsHash, postType, parentId, tags, content } = req.body;

    const post = await PostMeta.create({
      postId:        postId || 0,
      txHash,
      ipfsHash,
      authorAddress: req.user.address,
      authorMeta:    req.user.userId,
      postType:      postType || "POST",
      parentId:      parentId || null,
      tags:          tags || [],
      preview:       content ? content.substring(0, 200) : "",
      createdAt:     new Date(),
    });

    // Notify followers via socket
    const io = req.app.get("io");
    io.to(`user:${req.user.address}`).emit("new_post", post);

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/posts/:id/comments
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const comments = await PostMeta.find({
      parentId:  req.params.id,
      postType:  "COMMENT",
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .populate("authorMeta", "username avatar address verified");

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/posts/:id/flag
 */
router.post("/:id/flag", auth, async (req, res) => {
  try {
    await PostMeta.findOneAndUpdate(
      { postId: req.params.id },
      { $inc: { flagCount: 1 } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
