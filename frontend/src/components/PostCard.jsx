import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Layout";

export default function PostCard({ post, onLike }) {
  const { socialContract, address } = useWeb3();
  const { api } = useAuth();
  const navigate = useNavigate();

  const [liked,     setLiked]     = useState(post.userLiked || false);
  const [likes,     setLikes]     = useState(post.likes || 0);
  const [liking,    setLiking]    = useState(false);
  const [flagging,  setFlagging]  = useState(false);
  const [flagged,   setFlagged]   = useState(false);

  const author   = post.authorMeta || {};
  const postAddr = author.address || post.authorAddress || "";
  const isOwn    = address && postAddr.toLowerCase() === address.toLowerCase();

  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60)   return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!socialContract || liking) return;
    setLiking(true);
    try {
      const tx = await socialContract.toggleLike(post.postId || 1);
      await tx.wait();
      if (liked) { setLiked(false); setLikes(l => l - 1); }
      else        { setLiked(true);  setLikes(l => l + 1); }
      onLike?.();
    } catch (err) {
      console.error("Like error:", err);
    } finally {
      setLiking(false);
    }
  };

  const handleFlag = async (e) => {
    e.stopPropagation();
    if (flagged || flagging) return;
    setFlagging(true);
    try {
      await api.post(`/api/posts/${post.postId}/flag`);
      setFlagged(true);
    } catch {}
    setFlagging(false);
  };

  return (
    <article
      onClick={() => navigate(`/post/${post.postId || post._id}`)}
      className="card hover:border-dark-500 cursor-pointer transition-all duration-200 group animate-fade-in">

      {/* Post type badge */}
      {post.postType === "REPOST" && (
        <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
          <span>🔁</span> Reposted
        </p>
      )}

      <div className="flex gap-3">
        <Avatar address={postAddr} size="w-10 h-10"
          onClick={e => { e.stopPropagation(); navigate(`/profile/${postAddr}`); }} />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-2 flex-wrap">
            <span
              onClick={e => { e.stopPropagation(); navigate(`/profile/${postAddr}`); }}
              className="font-display font-semibold text-white hover:text-brand-300 transition-colors cursor-pointer">
              {author.username || `${postAddr.slice(0, 6)}…${postAddr.slice(-4)}`}
            </span>
            {author.verified && <span className="text-brand-400 text-xs">✓</span>}
            <span className="text-gray-600 text-xs font-mono">
              {postAddr.slice(0, 6)}…{postAddr.slice(-4)}
            </span>
            <span className="text-gray-600 text-xs ml-auto">{timeAgo(post.createdAt)}</span>
          </div>

          {/* Content */}
          <p className="text-gray-200 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words">
            {post.preview || post.content || ""}
          </p>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.map(tag => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>
          )}

          {/* IPFS badge */}
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs font-mono text-gray-600 bg-dark-700 border border-dark-500 rounded px-2 py-0.5">
              ipfs:{post.ipfsHash?.slice(0, 12)}…
            </span>
            {post.txHash && (
              <span className="text-xs font-mono text-gray-600 bg-dark-700 border border-dark-500 rounded px-2 py-0.5">
                tx:{post.txHash?.slice(0, 10)}…
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-5 text-gray-500">
            {/* Like */}
            <button onClick={handleLike} disabled={liking}
              className={`flex items-center gap-1.5 text-sm hover:text-red-400 transition-colors
                          ${liked ? "text-red-400" : ""} ${liking ? "opacity-50" : ""}`}>
              {liking
                ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                : <span>{liked ? "❤️" : "🤍"}</span>}
              <span className="font-mono text-xs">{likes}</span>
            </button>

            {/* Comment */}
            <button onClick={e => { e.stopPropagation(); navigate(`/post/${post.postId || post._id}`); }}
              className="flex items-center gap-1.5 text-sm hover:text-brand-400 transition-colors">
              <span>💬</span>
              <span className="font-mono text-xs">{post.commentCount || 0}</span>
            </button>

            {/* Repost */}
            <button onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-sm hover:text-green-400 transition-colors">
              <span>🔁</span>
              <span className="font-mono text-xs">{post.reposts || 0}</span>
            </button>

            {/* Flag */}
            {!isOwn && (
              <button onClick={handleFlag} disabled={flagged || flagging}
                className={`ml-auto text-xs hover:text-amber-400 transition-colors ${flagged ? "text-amber-400" : ""}`}
                title="Flag content">
                {flagged ? "🚩 Flagged" : "⚑"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
