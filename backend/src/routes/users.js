const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const User    = require("../models/User");

// GET /api/users/:address
router.get("/:address", async (req, res) => {
  try {
    const user = await User.findOne({ address: req.params.address.toLowerCase() })
      .select("-nonce -__v");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/profile
router.patch("/profile", auth, async (req, res) => {
  try {
    const { username, bio, avatar, website, publicKey } = req.body;
    const update = {};
    if (username)  update.username  = username;
    if (bio)       update.bio       = bio;
    if (avatar)    update.avatar    = avatar;
    if (website)   update.website   = website;
    if (publicKey) update.publicKey = publicKey; // For E2E encrypted DMs

    const user = await User.findOneAndUpdate(
      { address: req.user.address },
      { $set: update },
      { new: true }
    ).select("-nonce");

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:address/followers
router.get("/:address/followers", async (req, res) => {
  try {
    const user = await User.findOne({ address: req.params.address.toLowerCase() })
      .populate("followers", "address username avatar");
    res.json({ followers: user?.followers || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/search?q=
router.get("/search/query", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ users: [] });
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: "i" } },
        { address:  { $regex: q, $options: "i" } },
      ],
    }).limit(20).select("address username avatar verified");
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
