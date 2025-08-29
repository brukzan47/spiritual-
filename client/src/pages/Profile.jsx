import React, { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { buildMediaSrc } from "../lib/media";

export default function Profile() {
  const { user, updateAvatar } = useAuth();
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [cacheKey, setCacheKey] = useState(Date.now());

  if (!user) return <div className="card">Please login.</div>;

  const avatarSrc = useMemo(() => {
    if (!user?.avatarUrl) return null;
    const base = buildMediaSrc(user.avatarUrl);          // normalize
    const sep  = base.includes("?") ? "&" : "?";
    const ts   = user?.updatedAt || cacheKey;            // cache-bust
    return `${base}${sep}t=${ts}`;
  }, [user?.avatarUrl, user?.updatedAt, cacheKey]);

  const onPick = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && !f.type?.startsWith("image/")) { setErr("Please select an image file."); return; }
    setErr(""); setMsg(""); setFile(f);
  };

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) return setErr("Choose an image file first.");
    try {
      setSaving(true);
      await updateAvatar(file);
      setMsg("Avatar updated!");
      setCacheKey(Date.now());
      setFile(null);
    } catch (e2) {
      setErr(e2?.response?.data?.error || "Upload failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-md mx-auto mt-8 card">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>

      <div className="flex items-center gap-4 mb-4">
        {avatarSrc ? (
          <img
            key={avatarSrc}
            src={avatarSrc}
            alt={user.username}
            style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
            onError={(e) => { e.currentTarget.style.opacity = 0.4; }}
          />
        ) : (
          <div className="nav-avatar" style={{ width: 96, height: 96, fontSize: 32 }}>
            {(user.username || "U").slice(0,1).toUpperCase()}
          </div>
        )}
        <div>
          <div className="font-bold">{user.username}</div>
          <div className="text-sm muted">{user.email}</div>
        </div>
      </div>

      <form onSubmit={onUpload} className="space-y-3">
        <input type="file" accept="image/*" onChange={onPick} />
        {file && (
          <div className="upload-preview upload-preview--sm">
            <img src={URL.createObjectURL(file)} alt="preview" />
          </div>
        )}
        {err && <div className="text-sm" style={{ color: "#dc2626" }}>{err}</div>}
        {msg && <div className="text-sm" style={{ color: "green" }}>{msg}</div>}
        <button className="btn w-full" disabled={saving || !file}>
          {saving ? "Uploading…" : "Update Avatar"}
        </button>

        {/* Tiny debug helper (optional): shows the final URL in case of issues */}
        {avatarSrc && (
          <div className="text-sm" style={{ marginTop: 8 }}>
            Image URL:&nbsp;
            <a href={avatarSrc} target="_blank" rel="noreferrer">{avatarSrc}</a>
          </div>
        )}
      </form>
    </div>
  );
}
