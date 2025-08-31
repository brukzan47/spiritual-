// server/config/db.js
import mongoose from "mongoose";

export default async function connectDB() {
  const uri = process.env.MONGO_URI || "";
  const safe = uri.replace(/(mongodb\+srv:\/\/[^:]+:).+?(@)/, "$1<hidden>$2");
  console.log("🔌 Connecting to Mongo:", safe);

  if (!uri) {
    console.error("❌ MONGO_URI not set");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { dbName: "spiritualgram", serverSelectionTimeoutMS: 20000 });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error", err);
    process.exit(1);
  }
}
