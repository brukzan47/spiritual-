import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "spiritualgram" });
  const broken = await User.find({ $or: [{ password: { $exists: false } }, { password: null }, { password: "" }] }).select("+password username email");
  console.log("Broken users count:", broken.length);
  broken.forEach(u => console.log({ id: u._id.toString(), username: u.username, email: u.email, passwordPresent: !!u.password }));
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
