import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";

export default function ExplorePage() {
  const { api } = useAuth();
  const [posts,   setPosts]   = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState("");
  const [tab,     setTab]     = useState("trending");
  const [activeTag, setActiveTag] = useState(null);

  const trendingTags = ["web3", "defi", "nft", "dao", "ethereum", "solidity", "ipfs", "crypto"];

  const fetchPosts = async (tag = null) => {
    setLoading(true);
    try {
      const url = tag ? `/api/posts/explore?tag=${tag}` : "/api/posts/explore";
      const { data } = await api.get(url);
      setPosts(data.posts);
    } catch { setPosts([]); }
    setLoading(false);
  };

  const searchUsers = async (q) => {
    if (!q.trim()) return setUsers([]);
    try {
      const { data } = await api.get(`/api/users/search/query?q=${q}`);
      setUsers(data.users);
    } catch { setUsers([]); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleTagClick = (tag) => {
    const next = activeTag === tag ? null : tag;
    setActiveTag(next);
    fetchPosts(next);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="font-display font-bold text-xl text-white mb-4">Explore</h1>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); searchUsers(e.target.value); }}
          placeholder="Search users by name or address…"
          className="input-field pl-9"
        />
      </div>

      {/* User search results */}
      {users.length > 0 && (
        <div className="card space-y-3">
          <p className="text-xs text-gray-500 font-display font-medium uppercase tracking-wider">Users</p>
          {users.map(u => (
            <div key={u.address} className="flex items-center gap-3 hover:bg-dark-700 rounded-xl p-2 cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-xs font-mono">
                {u.address.slice(2,4).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-display">{u.username || "Anonymous"}</p>
                <p className="text-gray-500 text-xs font-mono">{u.address.slice(0,10)}…</p>
              </div>
              {u.verified && <span className="ml-auto text-brand-400 text-xs">✓ verified</span>}
            </div>
          ))}
        </div>
      )}

      {/* Trending tags */}
      <div>
        <p className="text-xs text-gray-500 font-display font-medium uppercase tracking-wider mb-3">Trending Tags</p>
        <div className="flex flex-wrap gap-2">
          {trendingTags.map(tag => (
            <button key={tag} onClick={() => handleTagClick(tag)}
              className={`tag cursor-pointer hover:border-brand-500 transition-all ${activeTag === tag ? "bg-brand-700/50 border-brand-500" : ""}`}>
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-700 rounded-xl p-1">
        {["trending", "latest"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-display font-medium transition-all
                        ${tab === t ? "bg-dark-500 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            {t === "trending" ? "🔥 Trending" : "🕐 Latest"}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
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
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">🔭</p>
          <p className="text-gray-500 text-sm">No posts found{activeTag ? ` for #${activeTag}` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post._id} post={post} />)}
        </div>
      )}
    </div>
  );
}
