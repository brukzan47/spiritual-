import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

// tiny helper so we don’t depend on external file
const buildMediaSrc = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
  return `${base}/${u.replace(/^\/+/, "")}`;
};

function CardPost({ post }) {
  const url = buildMediaSrc(post.mediaUrl || post.imageUrl || "");
  const isVideo =
    (post.mediaType || "").toLowerCase() === "video" ||
    /\.(mp4|webm|ogg)$/i.test(url);
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="post-media">
        {isVideo ? <video src={url} controls /> : <img src={url} alt={post.caption || "post"} />}
      </div>
      {(post.caption || post.verse) && (
        <div style={{ padding: 12 }}>
          {post.verse && <div style={{ fontWeight: 600 }}>{post.verse}</div>}
          {post.caption && <div>{post.caption}</div>}
        </div>
      )}
    </div>
  );
}

export default function UserProfile() {
  const { id } = useParams(); // can be ObjectId or username
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true);
      try {
        const ures = await api.get(`/users/${encodeURIComponent(id)}`);
        if (dead) return;
        setUser(ures.data.user);
        const pres = await api.get(`/users/${encodeURIComponent(id)}/posts`, { params: { page: 1, limit: 12 } });
        if (dead) return;
        setPosts(pres.data.posts || []);
        setPage(pres.data.page || 1);
        setPages(pres.data.pages || 0);
        setTotal(pres.data.total || 0);
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, [id]);

  const avatar = useMemo(() => {
    if (!user?.avatarUrl) return null;
    const base = buildMediaSrc(user.avatarUrl);
    return `${base}${base.includes("?") ? "&" : "?"}t=${new Date(user.updatedAt || Date.now()).getTime()}`;
  }, [user?.avatarUrl, user?.updatedAt]);

  if (loading && !user) return <div className="card">Loading…</div>;
  if (!user) return <div className="card">User not found.</div>;

  return (
    <div className="space-y-3">
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {avatar ? (
          <img
            src={avatar}
            alt={user.username}
            style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
            onError={(e) => { e.currentTarget.style.opacity = 0.4; }}
          />
        ) : (
          <div className="nav-avatar" style={{ width: 84, height: 84, fontSize: 28 }}>
            {(user.username || "U").slice(0,1).toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{user.username}</div>
          <div className="muted">{user.bio || "No bio yet."}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Posts: <strong>{user.postsCount ?? total}</strong>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="card">No posts yet.</div>
      ) : (
        <div className="grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12
        }}>
          {posts.map(p => <CardPost key={p._id} post={p} />)}
        </div>
      )}

      {pages > 1 && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            className="btn btn--ghost"
            onClick={async () => {
              if (page <= 1) return;
              const { data } = await api.get(`/users/${encodeURIComponent(id)}/posts`, { params: { page: page - 1, limit: 12 } });
              setPosts(data.posts || []); setPage(data.page || 1); setPages(data.pages || 0); setTotal(data.total || 0);
            }}
            disabled={page <= 1}
          >← Prev</button>
          <div className="muted">Page {page} / {pages}</div>
          <button
            className="btn btn--ghost"
            onClick={async () => {
              if (page >= pages) return;
              const { data } = await api.get(`/users/${encodeURIComponent(id)}/posts`, { params: { page: page + 1, limit: 12 } });
              setPosts(data.posts || []); setPage(data.page || 1); setPages(data.pages || 0); setTotal(data.total || 0);
            }}
            disabled={page >= pages}
          >Next →</button>
        </div>
      )}
    </div>
  );
}
