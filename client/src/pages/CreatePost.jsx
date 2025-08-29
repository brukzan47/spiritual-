import React, { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";


export default function CreatePost() {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [verse, setVerse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setFile(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // must be logged in (token set by your /auth/login or /auth/register)
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to post.");
      return;
    }

    if (!file) {
      setError("Please select an image or video.");
      return;
    }

    const form = new FormData();
    form.append("media", file);      // ✅ server expects "media" (also accepts "image"/"video")
    form.append("caption", caption || "");
    form.append("verse", verse || "");

    try {
      setLoading(true);
      // ✅ DO NOT set Content-Type manually; let Axios set the boundary
      await api.post("/posts", form);
      nav("/");
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "Failed to create post";
      setError(msg);
      console.error("CreatePost error:", e?.response?.data || e);
    } finally {
      setLoading(false);
    }
  };

  const isVideo = file && file.type.startsWith("video/");
  const isImage = file && file.type.startsWith("image/");

  return (
    <div className="max-w-md mx-auto mt-8 card">
      <h1 className="text-2xl font-bold mb-4">Share a Blessing</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="file"
          accept="image/*,video/*"
          onChange={onFileChange}
        />

        {file && isImage && (
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 12 }}
          />
        )}
        {file && isVideo && (
          <video
            src={URL.createObjectURL(file)}
            controls
            style={{ width: "100%", maxHeight: 320, borderRadius: 12, background: "#000" }}
          />
        )}

        <input
          className="input"
          placeholder="Optional verse or quote"
          value={verse}
          onChange={(e) => setVerse(e.target.value)}
        />
        <textarea
          className="input"
          rows="3"
          placeholder="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button className="btn w-full" disabled={loading}>
          {loading ? "Posting…" : "Post"}
        </button>
      </form>
    </div>
  );
}
