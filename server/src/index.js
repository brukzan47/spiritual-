import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
// server/src/index.js
import Conversation from "../models/Conversation.js";

// after connectDB()
//await Conversation.syncIndexes();  // one-time: aligns DB indexes to schema


import connectDB from "../config/db.js";
import authRoutes from "../routes/authRoutes.js";
import postRoutes from "../routes/postRoutes.js";
import userRoutes from "../routes/userRoutes.js";
import chatRoutes from "../routes/chatRoutes.js";


dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT            = process.env.PORT || 5000;
const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR || "uploads";
const UPLOAD_DIR_PATH = path.join(__dirname, "..", UPLOAD_DIR_NAME);

fs.mkdirSync(UPLOAD_DIR_PATH, { recursive: true });

await connectDB();

// if you ever put this behind a proxy, this helps correct req.protocol
app.set("trust proxy", true);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// serve static uploads
//app.use("/uploads", express.static(path.join(__dirname, "..", UPLOAD_DIR)));

app.use("/uploads", express.static(UPLOAD_DIR_PATH));
//app.use("/uploads", express.static(path.join(__dirname, "..", UPLOAD_DIR)));

console.log("📂 Serving uploads from:", UPLOAD_DIR_PATH);

app.get("/", (_req, res) => res.json({ ok: true, message: "Spiritualgram API" }));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes); // 👈 add this line

// 404 & error
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});
//import http from "http";

//const server = http.createServer(app);

// server/src/index.js
//import Conversation from "../models/Conversation.js";

// after connectDB()
await Conversation.syncIndexes();  // one-time: aligns DB indexes to schema

app.listen(PORT, () => console.log(`✅ API on http://localhost:${PORT}`));
// src/index.js
