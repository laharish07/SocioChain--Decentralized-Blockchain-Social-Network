const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const Group   = require("../models/Group");

router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const groups = await Group.find({ isPrivate: false })
      .sort({ memberCount: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const group = await Group.findOne({ groupId: req.params.id });
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { groupId, txHash, name, description, avatar, isPrivate } = req.body;
    const group = await Group.create({
      groupId,
      txHash,
      name,
      description,
      avatar,
      isPrivate:    isPrivate || false,
      creatorAddress: req.user.address,
      members:      [req.user.address],
      memberCount:  1,
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
