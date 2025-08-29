import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

// EDIT THESE:
const IDENTIFIER = "demo@example.com";  // email OR username
const NEW_PASSWORD = "pass1234";

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "spiritualgram" });

  const query = IDENTIFIER.includes("@") ? { email: IDENTIFIER.toLowerCase() } : { username: IDENTIFIER };
  const user = await User.findOne(query).select("+password username email");
  if (!user) throw new Error("User not found");

  user.password = await bcrypt.hash(NEW_PASSWORD, 10);
  await user.save();
  console.log("Password reset for:", { id: user._id.toString(), username: user.username, email: user.email });

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
