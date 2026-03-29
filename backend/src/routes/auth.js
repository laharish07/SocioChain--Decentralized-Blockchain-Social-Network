const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const { ethers } = require("ethers");
const User    = require("../models/User");

/**
 * GET /api/auth/nonce/:address
 * Returns a random nonce for the wallet to sign
 */
router.get("/nonce/:address", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const nonce = Math.floor(Math.random() * 1_000_000).toString();

    await User.findOneAndUpdate(
      { address },
      { address, nonce, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({
      nonce,
      message: `Sign this message to authenticate with SocioChain.\n\nNonce: ${nonce}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/verify
 * Verifies MetaMask signature and returns JWT
 */
router.post("/verify", async (req, res) => {
  try {
    const { address, signature } = req.body;
    if (!address || !signature) {
      return res.status(400).json({ error: "address and signature required" });
    }

    const normalizedAddr = address.toLowerCase();
    const user = await User.findOne({ address: normalizedAddr });
    if (!user) return res.status(404).json({ error: "Nonce not found — call /nonce first" });

    const message = `Sign this message to authenticate with SocioChain.\n\nNonce: ${user.nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== normalizedAddr) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Rotate nonce (prevent replay)
    user.nonce = Math.floor(Math.random() * 1_000_000).toString();
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { address: normalizedAddr, userId: user._id },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      address: normalizedAddr,
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get("/me", require("../middleware/auth"), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-nonce");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
