import React, { useEffect, useState } from "react";
import api from "../api";
import PostCard from "../components/PostCard";
import { useAuth } from "../contexts/AuthContext";

export default function Feed() {
  const { user } = useAuth();
  const me = user?._id || null;

  const [posts, setPosts] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const { data } = await api.get("/posts/feed");
      const arr = (data.posts || []).map(p => {
        const likes = Array.isArray(p.likes) ? p.likes : [];
        const liked = likes.some(v => String(v?._id || v) === String(me));
        return {
          ...p,
          liked,
          likesCount: p.likesCount ?? likes.length,
          commentsCount: p.commentsCount ?? 0
        };
      });
      setPosts(arr);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load feed");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [me]);

  const onPatch = (id, patch) =>
    setPosts(ps => ps.map(p => (p._id === id ? { ...p, ...patch } : p)));

  const onRemove = (id) =>
    setPosts(ps => ps.filter(p => p._id !== id));

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      {err && <div className="text-sm" style={{ color: "red" }}>{err}</div>}
      {posts.map(p => (
        <PostCard
          key={p._id}
          post={p}
          me={me}
          onPatch={onPatch}
          onRemove={onRemove}
        />
      ))}
      {!posts.length && !err && <div className="card">loading.............</div>}
    </div>
  );
}
