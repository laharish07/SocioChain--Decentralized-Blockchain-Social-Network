import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import PostComposer from "../components/PostComposer";
import PostCard from "../components/PostCard";

export default function FeedPage() {
  const { api } = useAuth();
  const { socialContract, address } = useWeb3();
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasProfile, setHasProfile] = useState(null);
  const [creatingProfile, setCreatingProfile] = useState(false);

  const checkProfile = useCallback(async () => {
    if (!socialContract || !address) return;
    try {
      const profile = await socialContract.getProfile(address);
      setHasProfile(profile.exists);
    } catch { setHasProfile(false); }
  }, [socialContract, address]);

  const fetchFeed = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/posts/feed?page=${p}&limit=20`);
      if (p === 1) setPosts(data.posts);
      else setPosts(prev => [...prev, ...data.posts]);
      setHasMore(data.posts.length === 20);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { checkProfile(); }, [checkProfile]);
  useEffect(() => { fetchFeed(1); }, [fetchFeed]);

  const handleCreateProfile = async () => {
    if (!socialContract) return;
    setCreatingProfile(true);
    try {
      const { data } = await api.post("/api/upload/json", {
        data: { username: `user_${address.slice(2,8)}`, bio: "", avatar: "", createdAt: Date.now() },
      });
      const tx = await socialContract.createProfile(data.ipfsHash);
      await tx.wait();
      setHasProfile(true);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingProfile(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display font-bold text-xl text-white">Feed</h1>
        <span className="text-xs font-mono text-gray-600 border border-dark-600 px-2 py-1 rounded-full">
          ⛓ on-chain
        </span>
      </div>

      {/* Profile creation prompt */}
      {hasProfile === false && (
        <div className="card border-brand-600/40 bg-brand-900/10">
          <p className="font-display font-semibold text-white mb-1">Create your on-chain profile</p>
          <p className="text-gray-400 text-sm mb-4">Your profile is a soulbound NFT on Ethereum. Create it once to start posting.</p>
          <button onClick={handleCreateProfile} disabled={creatingProfile} className="btn-primary text-sm">
            {creatingProfile ? "Creating on blockchain…" : "🪪 Create Profile NFT"}
          </button>
        </div>
      )}

      {/* Composer */}
      {hasProfile && <PostComposer onPost={() => fetchFeed(1)} />}

      {/* Posts */}
      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-dark-600 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-dark-600 rounded w-1/3" />
                  <div className="h-3 bg-dark-600 rounded w-full" />
                  <div className="h-3 bg-dark-600 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🌐</p>
          <p className="font-display font-semibold text-white mb-2">Your feed is empty</p>
          <p className="text-gray-500 text-sm">Follow people or create your first post to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post._id || post.postId} post={post} onLike={() => fetchFeed(1)} />
          ))}
          {hasMore && (
            <button onClick={() => { const next = page + 1; setPage(next); fetchFeed(next); }}
              className="w-full btn-ghost text-sm py-3">
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
