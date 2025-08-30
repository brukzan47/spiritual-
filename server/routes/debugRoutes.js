import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Post from "../models/post.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..", "..");
const uploadDir = path.join(ROOT_DIR, process.env.UPLOAD_DIR || "uploads");

// List upload files
router.get("/uploads", (req, res) => {
  try {
    const files = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
    res.json({ uploadDir, count: files.length, files });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Show base URL the server thinks it is
router.get("/base", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json({ baseUrl });
});

// Fix existing posts that have bad/relative imageUrl values
router.put("/fix-image-urls", async (req, res, next) => {
  try {
    // Optional: simple guard
    if (process.env.ADMIN_TOKEN && (req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN)) {
      return res.status(401).json({ error: "Not authorized" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const posts = await Post.find({});
    let updated = 0;

    for (const p of posts) {
      const url = p.imageUrl || "";
      if (!url) continue;
      if (url.startsWith("http")) continue;

      // normalize: "uploads/x.jpg", "/uploads/x.jpg", "x.jpg"
      const clean = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+/, "");
      const finalPath = clean.startsWith("uploads") ? clean : `uploads/${clean}`;
      const newUrl = `${baseUrl}/${finalPath}`;

      if (newUrl !== p.imageUrl) {
        p.imageUrl = newUrl;
        await p.save();
        updated++;
      }
    }
    res.json({ baseUrl, updated, total: posts.length });
  } catch (e) { next(e); }
});

export default router;
