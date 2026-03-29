const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const multer  = require("multer");
const axios   = require("axios");
const FormData = require("form-data");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * POST /api/upload/ipfs
 * Upload file to IPFS via Pinata
 */
router.post("/ipfs", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });

    const pinataKey    = process.env.PINATA_API_KEY;
    const pinataSecret = process.env.PINATA_SECRET_KEY;

    if (!pinataKey) {
      // Fallback: return mock hash for local dev
      return res.json({
        ipfsHash: "Qm" + Math.random().toString(36).substring(2, 48),
        url:      "https://ipfs.io/ipfs/mock",
      });
    }

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key:        pinataKey,
          pinata_secret_api_key: pinataSecret,
        },
      }
    );

    const ipfsHash = response.data.IpfsHash;
    res.json({
      ipfsHash,
      url: `${process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/"}${ipfsHash}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/upload/json
 * Pin JSON metadata to IPFS
 */
router.post("/json", auth, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: "No data" });

    const pinataKey    = process.env.PINATA_API_KEY;
    const pinataSecret = process.env.PINATA_SECRET_KEY;

    if (!pinataKey) {
      return res.json({
        ipfsHash: "Qm" + Math.random().toString(36).substring(2, 48),
      });
    }

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      { pinataContent: data },
      {
        headers: {
          "Content-Type":        "application/json",
          pinata_api_key:        pinataKey,
          pinata_secret_api_key: pinataSecret,
        },
      }
    );

    res.json({ ipfsHash: response.data.IpfsHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
