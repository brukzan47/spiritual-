// server/src/routes/postRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Post from "../models/post.js";
import User from "../models/User.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// where files are stored: <repo>/server/uploads (or custom via env)
const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR || "uploads";
const UPLOAD_DIR_PATH = path.resolve(__dirname, "..", "..", UPLOAD_DIR_NAME);
fs.mkdirSync(UPLOAD_DIR_PATH, { recursive: true });

// ---------- helpers ----------
const isId = (v) => mongoose.isValidObjectId(v);

const toPublicUrl = (req, filename) => {
  const base = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/,"");
  return `${base}/uploads/${filename}`;
};

const filenameFromUrl = (u = "") => {
  try {
    const s = String(u);
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) {
      const url = new URL(s);
      const parts = url.pathname.split("/").filter(Boolean);
      return parts.at(-1) || "";
    }
    return s.replace(/^\/+/, "").replace(/^uploads\/?/i, "").split("/").pop() || "";
  } catch {
    return "";
  }
};

// ---------- multer (accepts one file under key 'media') ----------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR_PATH),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "media", ext)
      .replace(/\s+/g, "_")
      .toLowerCase();
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

/* =========================
   SEARCH POSTS
   GET /api/posts/search?q=love&page=1&limit=20
   ========================= */
router.get("/search", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const page  = Math.max(parseInt(req.query.page  || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 50);
    const skip  = (page - 1) * limit;

    if (!q) return res.json({ posts: [], total: 0, page, pages: 0, q });

    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    // author match
    const authors   = await User.find({ username: rx }).select("_id").lean();
    const authorIds = authors.map(a => a._id);

    const match = { $or: [{ caption: rx }, { verse: rx }, { user: { $in: authorIds } }] };

    const [items, total] = await Promise.all([
      Post.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username avatarUrl")
        .lean(),
      Post.countDocuments(match),
    ]);

    res.json({ posts: items, total, page, pages: Math.ceil(total / limit), q });
  } catch (e) { next(e); }
});

/* =========================
   CREATE POST  (image or video)
   Body: FormData with key 'media'
   ========================= */
router.post("/", authRequired, upload.single("media"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file. Use FormData key 'media'." });

    const mime = (req.file.mimetype || "").toLowerCase();
    const mediaType = mime.startsWith("video/") ? "video" : "image";
    const mediaUrl  = toPublicUrl(req, req.file.filename);
    const { caption = "", verse = "" } = req.body || {};

    const post = await Post.create({
      user: req.user.id,
      caption,
      verse,
      mediaUrl,
      mediaType,
    });

    const populated = await post.populate("user", "username avatarUrl");
    res.json({ post: populated });
  } catch (e) { next(e); }
});

/* =========================
   FEED
   ========================= */
router.get("/feed", async (_req, res, next) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("user", "username avatarUrl");
    res.json({ posts });
  } catch (e) { next(e); }
});

/* =========================
   LIKE TOGGLE
   ========================= */
router.post("/:id/like", authRequired, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid post id" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const me = String(req.user.id);
    const ix = post.likes.findIndex((v) => String(v) === me);
    if (ix >= 0) post.likes.splice(ix, 1);
    else post.likes.push(req.user.id);

    post.likesCount = post.likes.length;
    await post.save();
    res.json({ liked: ix < 0, likesCount: post.likesCount });
  } catch (e) { next(e); }
});

/* =========================
   DELETE POST (owner only)
   ========================= */
router.delete("/:id", authRequired, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid post id" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (String(post.user) !== String(req.user.id)) return res.status(403).json({ error: "Not allowed" });

    // delete underlying file (best-effort)
    const fname = filenameFromUrl(post.mediaUrl || post.imageUrl || post.videoUrl);
    if (fname) {
      const fpath = path.join(UPLOAD_DIR_PATH, fname);
      if (fs.existsSync(fpath)) { try { fs.unlinkSync(fpath); } catch {} }
    }

    await post.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* =========================
   COMMENTS: LIST
   ========================= */
router.get("/:id/comments", async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid post id" });
    const post = await Post.findById(req.params.id).populate("comments.user", "username avatarUrl");
    if (!post) return res.status(404).json({ error: "Post not found" });
    const comments = [...(post.comments || [])].sort((a, b) => b.createdAt - a.createdAt);
    res.json({ comments, commentsCount: post.commentsCount ?? comments.length });
  } catch (e) { next(e); }
});

/* =========================
   COMMENTS: ADD
   ========================= */
router.post("/:id/comments", authRequired, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid post id" });
    const text = (req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "Text required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({ user: req.user.id, text });
    post.commentsCount = post.comments.length;
    await post.save();

    // populate new comment's user
    const idx = post.comments.length - 1;
    await post.populate({ path: `comments.${idx}.user`, select: "username avatarUrl" });

    res.json({ comment: post.comments[idx], commentsCount: post.commentsCount });
  } catch (e) { next(e); }
});

/* =========================
   COMMENTS: DELETE (author or post owner)
   ========================= */
router.delete("/:id/comments/:cid", authRequired, async (req, res, next) => {
  try {
    if (!isId(req.params.id) || !isId(req.params.cid)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const i = post.comments.findIndex((c) => String(c._id) === req.params.cid);
    if (i < 0) return res.status(404).json({ error: "Comment not found" });

    const cm = post.comments[i];
    const me = String(req.user.id);
    if (String(cm.user) !== me && String(post.user) !== me) {
      return res.status(403).json({ error: "Not allowed" });
    }

    post.comments.splice(i, 1);
    post.commentsCount = post.comments.length;
    await post.save();
    res.json({ ok: true, commentsCount: post.commentsCount });
  } catch (e) { next(e); }
});

/* =========================
   MEDIA STREAM (fallback)
   ========================= */
router.get("/:id/media", async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid post id" });
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ error: "Post not found" });

    const fname = filenameFromUrl(post.mediaUrl || post.imageUrl || post.videoUrl);
    if (!fname) return res.status(404).json({ error: "File not found" });

    const fpath = path.join(UPLOAD_DIR_PATH, fname);
    if (!fs.existsSync(fpath)) return res.status(404).json({ error: "File not found" });

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(fpath);
  } catch (e) { next(e); }
});

export default router;
