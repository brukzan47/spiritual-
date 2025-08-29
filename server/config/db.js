import mongoose from "mongoose";



export default async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI not set");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { dbName: "spiritualgram" });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error", err);
    process.exit(1);
  }
}
