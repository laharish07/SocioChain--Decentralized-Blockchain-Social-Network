import { useState, useRef } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Layout";

export default function PostComposer({ onPost, placeholder = "What's happening on-chain?", parentId = null }) {
  const { address, socialContract } = useWeb3();
  const { api } = useAuth();
  const [content,   setContent]   = useState("");
  const [tags,      setTags]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [txStatus,  setTxStatus]  = useState(null);
  const fileRef = useRef(null);
  const [mediaUrl, setMediaUrl]   = useState(null);

  const MAX_CHARS = 500;
  const remaining = MAX_CHARS - content.length;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    if (!socialContract) { setError("Contracts not loaded — check your .env"); return; }

    setLoading(true);
    setError(null);
    try {
      // 1. Upload content to IPFS via backend
      setTxStatus("📦 Uploading to IPFS…");
      const { data: ipfsData } = await api.post("/api/upload/json", {
        data: {
          text:      content.trim(),
          media:     mediaUrl ? [mediaUrl] : [],
          tags:      tags.split(",").map(t => t.trim()).filter(Boolean),
          createdAt: Date.now(),
        },
      });

      // 2. Write IPFS hash to blockchain
      setTxStatus("⛓ Writing to blockchain…");
      const postType = parentId ? 1 : 0; // 0=POST, 1=COMMENT
      const tx = await socialContract.createPost(ipfsData.ipfsHash, postType, parentId || 0);
      setTxStatus("⏳ Confirming transaction…");
      const receipt = await tx.wait();

      // Parse postId from event logs
      const event = receipt.logs
        .map(log => { try { return socialContract.interface.parseLog(log); } catch { return null; } })
        .find(e => e?.name === "PostCreated");

      const postId = event ? Number(event.args.postId) : 0;

      // 3. Cache in backend for fast feed queries
      setTxStatus("💾 Saving metadata…");
      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
      await api.post("/api/posts", {
        txHash:   receipt.hash,
        postId,
        ipfsHash: ipfsData.ipfsHash,
        postType: parentId ? "COMMENT" : "POST",
        parentId: parentId?.toString() || null,
        tags:     tagList,
        content:  content.trim(),
      });

      setContent("");
      setTags("");
      setMediaUrl(null);
      setTxStatus(null);
      onPost?.();
    } catch (err) {
      setError(err.reason || err.message);
      setTxStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="flex gap-3">
        <Avatar address={address} size="w-10 h-10" className="mt-1 shrink-0" />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder={placeholder}
            rows={3}
            className="input-field resize-none bg-transparent border-0 px-0 text-base leading-relaxed
                       focus:ring-0 placeholder-gray-600"
          />

          {/* Tags */}
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Tags: web3, defi, nft (comma separated)"
            className="input-field mt-2 text-xs py-2"
          />

          {error && (
            <p className="text-red-400 text-xs mt-2 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-1.5">
              ⚠ {error}
            </p>
          )}
          {txStatus && (
            <p className="text-brand-300 text-xs mt-2 bg-brand-900/20 border border-brand-700/30 rounded-lg px-3 py-1.5 font-mono flex items-center gap-2">
              <span className="w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin" />
              {txStatus}
            </p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-600">
            <div className="flex items-center gap-3 text-gray-500">
              <button className="hover:text-brand-400 transition-colors text-sm" title="Attach image">📎</button>
              <span className="text-xs font-mono text-gray-600">
                IPFS + Ethereum
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono ${remaining < 50 ? "text-amber-400" : "text-gray-600"}`}>
                {remaining}
              </span>
              <button
                onClick={handleSubmit}
                disabled={loading || !content.trim()}
                className="btn-primary text-sm px-5 py-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    Publishing…
                  </span>
                ) : "Post On-Chain"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
