import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
const isId = (v) => mongoose.isValidObjectId(v);

/* ---------- uploads setup (reuse same UPLOAD_DIR) ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR || "uploads";
const UPLOAD_DIR_PATH = path.join(__dirname, "..", "..", UPLOAD_DIR_NAME);
fs.mkdirSync(UPLOAD_DIR_PATH, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR_PATH),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname || "").toLowerCase();
    const base = path.basename(file.originalname || "media", ext).replace(/\s+/g, "_").toLowerCase();
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

const publicUrl = (req, filename) => {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${filename}`;
};

function filenameFromUrl(mediaUrl = "") {
  try {
    if (/^https?:\/\//i.test(mediaUrl)) {
      const u = new URL(mediaUrl);
      const parts = u.pathname.split("/").filter(Boolean);
      return parts.at(-1) || "";
    }
    return String(mediaUrl).replace(/^\/+/, "").replace(/^uploads\/?/i, "").split("/").pop() || "";
  } catch {
    return String(mediaUrl).split("/").pop() || "";
  }
}

/* ---------- users list ---------- */
router.get("/users", authRequired, async (req, res, next) => {
  try {
    const me = req.user.id;
    const q = (req.query.q || "").toString().trim();
    const find = {
      _id: { $ne: me },
      ...(q ? { $or: [{ username: new RegExp(q, "i") }, { email: new RegExp(q, "i") }] } : {})
    };
    const users = await User.find(find).select("_id username avatarUrl").limit(50);
    res.json({ users });
  } catch (e) { next(e); }
});

/* ---------- find/create conversation ---------- */
router.post("/conversations", authRequired, async (req, res, next) => {
  try {
    const me = req.user.id;
    const other = (req.body?.userId || "").toString();
    if (!isId(other)) return res.status(400).json({ error: "Invalid userId" });
    if (other === me) return res.status(400).json({ error: "Cannot chat with yourself" });

    let convo = await Conversation.findOne({ participants: { $all: [me, other], $size: 2 } });
    if (!convo) {
      convo = await Conversation.create({ participants: [me, other], lastMessageAt: new Date() });
    }
    await convo.populate("participants", "_id username avatarUrl");
    res.json({ conversation: convo });
  } catch (e) { next(e); }
});

/* ---------- get messages ---------- */
router.get("/conversations/:id/messages", authRequired, async (req, res, next) => {
  try {
    const me = req.user.id;
    const id = req.params.id;
    if (!isId(id)) return res.status(400).json({ error: "Invalid conversation id" });

    const convo = await Conversation.findById(id).select("_id participants");
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!convo.participants.some(p => String(p) === String(me))) {
      return res.status(403).json({ error: "Not a participant" });
    }

    const messages = await Message.find({ conversation: id })
      .sort({ createdAt: 1 })
      .populate("sender", "_id username avatarUrl");
    res.json({ messages });
  } catch (e) { next(e); }
});

/* ---------- send message (text OR image/audio) ---------- */
router.post(
  "/conversations/:id/messages",
  authRequired,
  upload.single("media"),           // <input name="media" />
  async (req, res, next) => {
    try {
      const me = req.user.id;
      const id = req.params.id;
      if (!isId(id)) return res.status(400).json({ error: "Invalid conversation id" });

      const convo = await Conversation.findById(id).select("_id participants");
      if (!convo) return res.status(404).json({ error: "Conversation not found" });
      if (!convo.participants.some(p => String(p) === String(me))) {
        return res.status(403).json({ error: "Not a participant" });
      }

      const text = (req.body?.text || "").toString().trim();
      const f = req.file || null;

      if (!text && !f) {
        return res.status(400).json({ error: "Provide text or a media file" });
      }

      let mediaUrl = null;
      let mediaType = null;

      if (f) {
        mediaUrl = publicUrl(req, f.filename);
        const mime = (f.mimetype || "").toLowerCase();
        if (mime.startsWith("image/")) mediaType = "image";
        else if (mime.startsWith("audio/")) mediaType = "audio";
        else return res.status(400).json({ error: "Only image/* or audio/* allowed" });
      }

      const msg = await Message.create({ conversation: id, sender: me, text, mediaUrl, mediaType });
      await msg.populate("sender", "_id username avatarUrl");

      convo.lastMessageAt = new Date();
      await convo.save();

      res.json({ message: msg });
    } catch (e) { next(e); }
  }
);

/* ---------- public media stream for a message ---------- */
/*  Note: for simplicity this is public (no auth). In production,
    you'd gate this by conversation membership, but <img>/<audio>
    tags can’t send Authorization headers easily. */
router.get("/messages/:mid/media", async (req, res, next) => {
  try {
    const mid = req.params.mid;
    if (!isId(mid)) return res.status(400).json({ error: "Invalid message id" });

    const msg = await Message.findById(mid).lean();
    if (!msg || !msg.mediaUrl) return res.status(404).json({ error: "File not found" });

    const fname = filenameFromUrl(msg.mediaUrl);
    const fpath = path.join(UPLOAD_DIR_PATH, fname);
    if (!fs.existsSync(fpath)) return res.status(404).json({ error: "File not found" });

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(fpath);
  } catch (e) { next(e); }
});

export default router;
