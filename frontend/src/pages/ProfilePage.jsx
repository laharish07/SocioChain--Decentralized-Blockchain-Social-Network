import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/Layout";
import PostCard from "../components/PostCard";

export default function ProfilePage() {
  const { address: viewAddress } = useParams();
  const { address, socialContract, tokenContract } = useWeb3();
  const { api } = useAuth();

  const [profile,    setProfile]    = useState(null);
  const [posts,      setPosts]      = useState([]);
  const [socBalance, setSocBalance] = useState("0");
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [following,  setFollowing]  = useState(false);
  const [tab,        setTab]        = useState("posts");

  const isOwn = address?.toLowerCase() === viewAddress?.toLowerCase();

  useEffect(() => {
    if (!viewAddress) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        // On-chain profile
        if (socialContract) {
          const p = await socialContract.getProfile(viewAddress);
          if (p.exists) {
            setProfile({
              wallet:         p.wallet,
              postCount:      Number(p.postCount),
              followerCount:  Number(p.followerCount),
              followingCount: Number(p.followingCount),
              verified:       p.verified,
              createdAt:      Number(p.createdAt) * 1000,
            });
          }
          if (address && address !== viewAddress.toLowerCase()) {
            const f = await socialContract.isFollowing(address, viewAddress);
            setIsFollowing(f);
          }
        }
        // SOC balance
        if (tokenContract) {
          const bal = await tokenContract.balanceOf(viewAddress);
          setSocBalance((Number(bal) / 1e18).toFixed(2));
        }
        // Off-chain metadata
        const { data: user } = await api.get(`/api/users/${viewAddress}`);
        setProfile(prev => ({ ...prev, ...user }));

        // Posts
        const { data: postsData } = await api.get(`/api/posts/explore?author=${viewAddress}`);
        setPosts(postsData.posts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [viewAddress, socialContract, tokenContract, address]);

  const handleFollow = async () => {
    if (!socialContract || following) return;
    setFollowing(true);
    try {
      const tx = isFollowing
        ? await socialContract.unfollow(viewAddress)
        : await socialContract.follow(viewAddress);
      await tx.wait();
      setIsFollowing(!isFollowing);
      setProfile(prev => ({
        ...prev,
        followerCount: isFollowing ? prev.followerCount - 1 : prev.followerCount + 1,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setFollowing(false);
    }
  };

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <div className="card animate-pulse h-40" />
      <div className="card animate-pulse h-24" />
    </div>
  );

  const displayName = profile?.username || `${viewAddress?.slice(0,6)}…${viewAddress?.slice(-4)}`;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Profile header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <Avatar address={viewAddress} size="w-16 h-16" className="text-xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display font-bold text-xl text-white flex items-center gap-2">
                  {displayName}
                  {profile?.verified && <span className="text-brand-400 text-sm">✓</span>}
                </h1>
                <p className="text-gray-500 text-xs font-mono mt-0.5">{viewAddress}</p>
              </div>
              {!isOwn && (
                <button onClick={handleFollow} disabled={following}
                  className={isFollowing ? "btn-ghost text-sm px-4 py-2" : "btn-primary text-sm px-4 py-2"}>
                  {following ? "…" : isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
            </div>

            {profile?.bio && (
              <p className="text-gray-300 text-sm mt-2 leading-relaxed">{profile.bio}</p>
            )}
            {profile?.website && (
              <a href={profile.website} target="_blank" rel="noreferrer"
                className="text-brand-400 text-xs hover:underline mt-1 block">
                🔗 {profile.website}
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-dark-600">
          {[
            { label: "Posts",     value: profile?.postCount || 0 },
            { label: "Followers", value: profile?.followerCount || 0 },
            { label: "Following", value: profile?.followingCount || 0 },
            { label: "SOC",       value: socBalance },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="font-display font-bold text-white text-lg">{stat.value}</p>
              <p className="text-gray-500 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* On-chain badge */}
        {profile?.createdAt && (
          <p className="text-xs font-mono text-gray-600 mt-3">
            ⛓ Profile NFT minted {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-700 rounded-xl p-1">
        {["posts", "likes"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-display font-medium transition-all
                        ${tab === t ? "bg-dark-500 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            {t === "posts" ? "📝 Posts" : "❤️ Liked"}
          </button>
        ))}
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-gray-500 text-sm">No posts yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post._id} post={post} />)}
        </div>
      )}
    </div>
  );
}
