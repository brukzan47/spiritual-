import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { serverOrigin } from "../api";

/** Build robust candidates from any stored URL (absolute, /uploads/, or filename) */
function candidatesFor(raw) {
  if (!raw) return [];
  const s = String(raw).trim();
  if (/^https?:\/\//i.test(s)) return [s];
  const cleaned = s.replace(/^\.{1,2}\//, "").replace(/^\/+/, "");
  return [
    `${serverOrigin}/${cleaned}`,
    `${serverOrigin}/uploads/${cleaned.replace(/^uploads\/?/i, "")}`,
  ];
}

function Media({ post }) {
  // try API media route first (always correct)
  const first = `${serverOrigin}/api/posts/${post._id}/media`;
  const raw   = post.mediaUrl || post.imageUrl || post.videoUrl || "";
  const rest  = candidatesFor(raw);
  const list  = useMemo(() => [first, ...rest], [first, raw]);

  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [post._id, raw]);

  const src = list[i] || "";
  const isVid =
    post.mediaType === "video" ||
    /\.mp4(\?.*)?$/i.test(src) ||
    /\.webm(\?.*)?$/i.test(src);

  const tryNext = () => { if (i < list.length - 1) setI(i + 1); };

  if (!src) return null;

  return (
    <div className="post-media">
      {isVid ? (
        <video src={src} controls onError={tryNext} />
      ) : (
        <img
          src={src}
          alt="post"
          onError={(e) => {
            tryNext();
            if (i >= list.length - 1) {
              e.currentTarget.alt = "image not found";
              e.currentTarget.style.opacity = 0.3;
            }
          }}
        />
      )}
    </div>
  );
}

export default function PostCard({ post, me, onPatch, onRemove }) {
  const [openC, setOpenC] = useState(false);
  const [comments, setComments] = useState(null);
  const [cLoading, setCLoading] = useState(false);
  const [cText, setCText] = useState("");
  const [busy, setBusy] = useState(false);

  const username   = post.user?.username || "User";
  const meOwnsPost = me && String(post.user?._id || post.user) === String(me);

  /* ----- Likes ----- */
  const toggleLike = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/like`);
      onPatch?.(post._id, { likesCount: data.likesCount, liked: data.liked });
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to like");
    } finally { setBusy(false); }
  };

  /* ----- Delete post (owner) ----- */
  const removePost = async () => {
    if (!meOwnsPost) return;
    if (!confirm("Delete this post?")) return;
    setBusy(true);
    try {
      await api.delete(`/posts/${post._id}`);
      onRemove?.(post._id);
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to delete");
    } finally { setBusy(false); }
  };

  /* ----- Comments: list / add / delete ----- */
  const loadComments = async () => {
    if (comments) return;
    setCLoading(true);
    try {
      const { data } = await api.get(`/posts/${post._id}/comments`);
      setComments(data.comments || []);
      onPatch?.(post._id, { commentsCount: data.commentsCount ?? (data.comments || []).length });
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to load comments");
    } finally { setCLoading(false); }
  };

  const addComment = async (e) => {
    e.preventDefault();
    const txt = cText.trim();
    if (!txt) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { text: txt });
      setComments((arr) => [data.comment, ...(arr || [])]);
      setCText("");
      onPatch?.(post._id, { commentsCount: data.commentsCount });
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to comment");
    } finally { setBusy(false); }
  };

  const canDeleteComment = (cm) => {
    const cmUserId = cm.user?._id || cm.user;
    return String(cmUserId) === String(me) || meOwnsPost;
  };

  const delComment = async (cid) => {
    setBusy(true);
    try {
      const { data } = await api.delete(`/posts/${post._id}/comments/${cid}`);
      setComments((arr) => (arr || []).filter(c => c._id !== cid));
      onPatch?.(post._id, { commentsCount: data.commentsCount });
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to delete comment");
    } finally { setBusy(false); }
  };

  return (
    <article className="card">
      <header className="flex items-center gap-3 mb-3">
        {post.user?.avatarUrl ? (
          <img
            src={post.user.avatarUrl}
            alt={username}
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
            onError={(e)=>{e.currentTarget.style.display="none";}}
          />
        ) : (
          <div className="nav-avatar">{username.slice(0,1).toUpperCase()}</div>
        )}
        <div className="font-semibold">
          <Link to={`/profile/${post.user?._id || ""}`} className="hover:underline">{username}</Link>
        </div>
        <div style={{ marginLeft: "auto", opacity: .7, fontSize: 12 }}>
          {new Date(post.createdAt).toLocaleString()}
        </div>
      </header>

      {/* media */}
      <Media post={post} />

      {post.verse && <div className="text-sm mt-2" style={{ color:"var(--muted)" }}>{post.verse}</div>}
      {post.caption && <div className="mt-1">{post.caption}</div>}

      <div className="post-actions">
        <button
          className={`like-btn ${post.liked ? "liked" : ""}`}
          onClick={toggleLike}
          disabled={busy}
        >
          ❤️ {post.likesCount ?? 0}
        </button>

        <button
          className="like-btn"
          onClick={() => {
            const open = !openC;
            setOpenC(open);
            if (open) loadComments();
          }}
          disabled={cLoading}
        >
          💬 {post.commentsCount ?? (comments?.length || 0)}
        </button>

        {meOwnsPost && (
          <button className="like-btn" onClick={removePost} disabled={busy} title="Delete">
            🗑️
          </button>
        )}
      </div>

      {openC && (
        <div className="mt-3">
          <form onSubmit={addComment} className="flex gap-2 mb-2">
            <input
              className="input"
              placeholder="Write a comment…"
              value={cText}
              onChange={(e)=>setCText(e.target.value)}
            />
            <button className="btn" disabled={busy || !cText.trim()}>Send</button>
          </form>

          {cLoading && <div className="text-sm" style={{ color:"var(--muted)" }}>Loading comments…</div>}

          <ul className="space-y-2">
            {(comments || []).map(c => (
              <li key={c._id} className="rounded-lg" style={{ border:"1px solid var(--border)", padding:"8px 10px" }}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.user?.username || "User"}</div>
                  <div className="text-[11px]" style={{ color:"var(--muted)" }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm mt-1">{c.text}</div>
                {canDeleteComment(c) && (
                  <button className="like-btn" style={{ marginTop: 6 }} onClick={()=>delComment(c._id)} disabled={busy}>
                    Delete
                  </button>
                )}
              </li>
            ))}
            {!cLoading && !comments?.length && (
              <div className="text-sm" style={{ color:"var(--muted)" }}>No comments yet.</div>
            )}
          </ul>
        </div>
      )}
    </article>
  );
}
