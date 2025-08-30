import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const commentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const postSchema = new Schema(
  {
    user:      { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    caption:   { type: String, default: "" },
    verse:     { type: String, default: "" },

    // unified media fields
    mediaUrl:  { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true, default: "image" },

    likes:       [{ type: Schema.Types.ObjectId, ref: "User" }],
    likesCount:  { type: Number, default: 0 },

    comments:       [commentSchema],
    commentsCount:  { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Post", postSchema);
