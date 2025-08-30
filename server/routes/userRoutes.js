// server/src/routes/userRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import User from "../models/User.js";
import Post from "../models/post.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ---------- storage / uploads ----------
const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR || "uploads";
// Files live at: <repo>/server/uploads (or custom via env)
const UPLOAD_DIR_PATH = path.resolve(__dirname, "..", "..", UPLOAD_DIR_NAME);
fs.mkdirSync(UPLOAD_DIR_PATH, { recursive: true });

// Build absolute URL, e.g. http://localhost:5000/uploads/xyz.jpg
function absoluteUrl(req, relativePath) {
  const base = (process.env.BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
  const rel  = String(relativePath || "").replace(/^\/+/, "");
  return `${base}/${rel}`;
}

// Multer for avatar uploads (field name: "avatar")
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR_PATH),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "avatar", ext)
      .replace(/\s+/g, "_")
      .toLowerCase();
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// ---------- helpers ----------
const isId = (v) => mongoose.isValidObjectId(v);

const cleanPrivate = (u) => ({
  _id: u._id,
  username: u.username,
  email: u.email,               // private/me responses can include email
  avatarUrl: u.avatarUrl || null,
  bio: u.bio || "",
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

const cleanPublic = (u) => ({
  _id: u._id,
  username: u.username,
  avatarUrl: u.avatarUrl || null,
  bio: u.bio || "",
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// ==================================================
// CURRENT USER
// ==================================================
router.get("/me", authRequired, async (req, res, next) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: "User not found" });
    res.json({ user: cleanPrivate(u) });
  } catch (e) { next(e); }
});

router.put("/me", authRequired, async (req, res, next) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: "User not found" });

    const { username, bio } = req.body || {};
    if (typeof username === "string" && username.trim()) u.username = username.trim();
    if (typeof bio === "string") u.bio = bio;

    await u.save();
    res.json({ user: cleanPrivate(u) });
  } catch (e) {
    // handle duplicate username nicely
    if (e?.code === 11000 && e?.keyPattern?.username) {
      return res.status(400).json({ error: "Username already taken" });
    }
    next(e);
  }
});

// Upload / replace avatar
// field name must be "avatar"
router.put("/me/avatar", authRequired, upload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Avatar file required (field: avatar)" });

    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: "User not found" });

    // delete previous avatar (best-effort)
    if (u.avatarUrl) {
      const prevName = u.avatarUrl.split("/").pop();
      const prevPath = path.join(UPLOAD_DIR_PATH, prevName);
      if (fs.existsSync(prevPath)) { try { fs.unlinkSync(prevPath); } catch { /* ignore */ } }
    }

    u.avatarUrl = absoluteUrl(req, `${UPLOAD_DIR_NAME}/${req.file.filename}`);
    await u.save(); // updates updatedAt

    res.json({ user: cleanPrivate(u) });
  } catch (e) { next(e); }
});

// ==================================================
// PUBLIC: USER LOOKUP & POSTS
// ==================================================

// Public user info by Mongo _id or by username
// GET /api/users/:idOrName
router.get("/:idOrName", async (req, res, next) => {
  try {
    const k = req.params.idOrName;
    const byId   = isId(k) ? await User.findById(k) : null;
    const byName = byId ? null : await User.findOne({ username: k });
    const u = byId || byName;
    if (!u) return res.status(404).json({ error: "User not found" });

    const postsCount = await Post.countDocuments({ user: u._id });
    res.json({ user: { ...cleanPublic(u), postsCount } });
  } catch (e) { next(e); }
});

// This user's posts (paginated)
// GET /api/users/:idOrName/posts?page=1&limit=12
router.get("/:idOrName/posts", async (req, res, next) => {
  try {
    const k = req.params.idOrName;
    const byId   = isId(k) ? await User.findById(k) : null;
    const byName = byId ? null : await User.findOne({ username: k });
    const u = byId || byName;
    if (!u) return res.status(404).json({ error: "User not found" });

    const page  = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 50);
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Post.find({ user: u._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username avatarUrl")
        .lean(),
      Post.countDocuments({ user: u._id }),
    ]);

    res.json({
      posts: items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (e) { next(e); }
});

// ==================================================
// SEARCH USERS (by username) — optional helper
// GET /api/users/search?q=br&page=1&limit=20
// ==================================================
router.get("/", async (req, res, next) => {
  try {
    // If you want this path strictly for /users/search, move this logic to /search
    if (!("q" in req.query)) return res.json({ users: [] });

    const q = String(req.query.q || "").trim();
    const page  = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 50);
    const skip  = (page - 1) * limit;

    if (!q) return res.json({ users: [], total: 0, page, pages: 0, q });

    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const [items, total] = await Promise.all([
      User.find({ username: rx })
        .select("_id username avatarUrl createdAt updatedAt bio")
        .sort({ username: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ username: rx }),
    ]);

    res.json({ users: items, total, page, pages: Math.ceil(total / limit), q });
  } catch (e) { next(e); }
});

export default router;
