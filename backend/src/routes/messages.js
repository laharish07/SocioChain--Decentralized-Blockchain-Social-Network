const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const Message = require("../models/Message");
const crypto  = require("crypto");

/**
 * GET /api/messages/conversations
 */
router.get("/conversations", auth, async (req, res) => {
  try {
    const convos = await Message.aggregate([
      {
        $match: {
          $or: [
            { fromAddress: req.user.address },
            { toAddress:   req.user.address },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ["$fromAddress", "$toAddress"] },
              { a: "$fromAddress", b: "$toAddress" },
              { a: "$toAddress",   b: "$fromAddress" },
            ],
          },
          lastMessage: { $first: "$$ROOT" },
          count:       { $sum: 1 },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      { $limit: 50 },
    ]);
    res.json({ conversations: convos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/messages/:address
 * Get messages between current user and another address
 */
router.get("/:address", auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const other = req.params.address.toLowerCase();

    const messages = await Message.find({
      $or: [
        { fromAddress: req.user.address, toAddress: other },
        { fromAddress: other, toAddress: req.user.address },
      ],
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/messages
 * Send encrypted DM
 */
router.post("/", auth, async (req, res) => {
  try {
    const { toAddress, encryptedContent, publicKeyUsed } = req.body;
    if (!toAddress || !encryptedContent) {
      return res.status(400).json({ error: "toAddress and encryptedContent required" });
    }

    const message = await Message.create({
      fromAddress:      req.user.address,
      toAddress:        toAddress.toLowerCase(),
      encryptedContent,
      publicKeyUsed,
      createdAt:        new Date(),
    });

    // Real-time delivery
    const io = req.app.get("io");
    io.to(`user:${toAddress.toLowerCase()}`).emit("new_message", {
      ...message.toObject(),
      from: req.user.address,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
