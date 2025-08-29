import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import User from "../models/User.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
const uploadNone = multer();

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });

// register
router.post("/register", uploadNone.none(), async (req, res, next) => {
  try {
    const { username = "", email = "", password = "" } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ error: "Missing fields: username, email, password" });
    const exists = await User.findOne({ $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }] });
    if (exists) return res.status(409).json({ error: "Username or email already in use" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username: username.trim(), email: email.toLowerCase().trim(), passwordHash, avatarUrl: "" });
    const token = sign(user._id);
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (e) { next(e); }
});

// login
router.post("/login", uploadNone.none(), async (req, res, next) => {
  try {
    const id = (req.body?.identifier ?? req.body?.email ?? req.body?.username ?? "").toString().trim();
    const pwd = (req.body?.password ?? "").toString();
    if (!id || !pwd) return res.status(400).json({ error: "Missing fields: identifier/email/username and password" });
    const query = id.includes("@") ? { email: id.toLowerCase() } : { username: id };
    const user = await User.findOne(query).select("+passwordHash username email avatarUrl");
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(pwd, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = sign(user._id);
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (e) { next(e); }
});

// ✅ include _id here
router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("_id username email avatarUrl");
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
