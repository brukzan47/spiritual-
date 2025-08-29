// client/src/pages/Search.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import PostCard from "../components/PostCard"; // ensure this exists

export default function Search() {
  const [q, setQ] = useState("");
  const [typing, setTyping] = useState("");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Debounce the input so we don't spam the server
  useEffect(() => {
    const id = setTimeout(() => setQ(typing.trim()), 400);
    return () => clearTimeout(id);
  }, [typing]);

  useEffect(() => {
    if (!q) { setPosts([]); setPage(1); setPages(0); setTotal(0); return; }
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/posts/search", { params: { q, page: 1, limit: 20 } });
        setPosts(data.posts || []);
        setPage(data.page || 1);
        setPages(data.pages || 0);
        setTotal(data.total || 0);
      } finally { setLoading(false); }
    };
    load();
  }, [q]);

  const onSubmit = (e) => { e.preventDefault(); setQ(typing.trim()); };

  // simple pager
  const canNext = page < pages;
  const canPrev = page > 1;
  const go = async (p) => {
    if (!q) return;
    setLoading(true);
    try {
      const { data } = await api.get("/posts/search", { params: { q, page: p, limit: 20 } });
      setPosts(data.posts || []);
      setPage(data.page || p);
      setPages(data.pages || 0);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          <input
            className="input"
            placeholder="Search posts by caption, verse, or username…"
            value={typing}
            onChange={(e) => setTyping(e.target.value)}
            autoFocus
          />
          <button className="btn" type="submit" disabled={!typing.trim()}>Search</button>
        </form>
        {q && (
          <div className="text-sm muted" style={{ marginTop: 8 }}>
            Showing results for <strong>{q}</strong> {loading ? "(loading…)" : `(${total})`}
          </div>
        )}
      </div>

      {!q && (
        <div className="card">
          <div className="muted">Try keywords like <code>prayer</code>, <code>psalm</code>, or a username.</div>
        </div>
      )}

      {q && !loading && posts.length === 0 && (
        <div className="card">No posts found.</div>
      )}

      <div className="space-y-3">
        {posts.map((p) =>
          <PostCard key={p._id} post={p} />
        )}
      </div>

      {pages > 1 && (
        <div className="card" style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <button className="btn btn--ghost" onClick={() => go(page - 1)} disabled={!canPrev}>← Prev</button>
          <div className="muted">Page {page} / {pages}</div>
          <button className="btn btn--ghost" onClick={() => go(page + 1)} disabled={!canNext}>Next →</button>
        </div>
      )}
    </div>
  );
}
