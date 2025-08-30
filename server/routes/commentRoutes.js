import express from "express";
import Comment from "../models/comment.js";
import Post from "../models/post.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// Create comment
router.post("/:postId", authRequired, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    const comment = await Comment.create({ post: post._id, user: req.user.id, text });
    const populated = await comment.populate([
      { path: "user", select: "username avatarUrl" },
      { path: "post", select: "_id" }
    ]);
    res.json({ comment: populated });
  } catch (e) { next(e); }
});

// List comments for a post
router.get("/:postId", async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })
      .populate("user", "username avatarUrl");
    res.json({ comments });
  } catch (e) { next(e); }
});

export default router;
