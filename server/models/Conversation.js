// server/src/models/Conversation.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    // remove index:true here
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// keep a single index (good for “recent” queries)
conversationSchema.index({ participants: 1, updatedAt: -1 });

export default mongoose.models.Conversation
  || mongoose.model("Conversation", conversationSchema);
