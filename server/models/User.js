import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username:    { type: String, required: true, unique: true, index: true, trim: true },
    email:       { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash:{ type: String, required: true, select: false }, // hidden
    avatarUrl:   { type: String, default: "" },
    bio:         { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
