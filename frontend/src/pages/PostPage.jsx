import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import PostComposer from "../components/PostComposer";

export default function PostPage() {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const [post,     setPost]     = useState(null);
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [postRes, commentsRes] = await Promise.all([
        api.get(`/api/posts/explore`).then(r => r.data.posts.find(p => String(p.postId) === id || p._id === id)),
        api.get(`/api/posts/${id}/comments`),
      ]);
      setPost(postRes || null);
      setComments(commentsRes.data.comments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <div className="card animate-pulse h-40" />
    </div>
  );

  if (!post) return (
    <div className="card text-center py-16 animate-fade-in">
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-display font-semibold text-white mb-2">Post not found</p>
      <button onClick={() => navigate(-1)} className="btn-ghost text-sm mt-3">← Go back</button>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white text-sm flex items-center gap-1 transition-colors">
        ← Back
      </button>

      <PostCard post={post} onLike={load} />

      <div className="border-l-2 border-brand-700/30 pl-4">
        <PostComposer
          parentId={Number(post.postId) || 0}
          placeholder="Reply on-chain…"
          onPost={load}
        />
      </div>

      {comments.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-display font-medium uppercase tracking-wider mb-3">
            {comments.length} {comments.length === 1 ? "Reply" : "Replies"}
          </p>
          <div className="space-y-3 border-l-2 border-dark-600 pl-4">
            {comments.map(c => <PostCard key={c._id} post={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}
