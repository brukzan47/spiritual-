import mongoose from "mongoose";

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender:       { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Text is optional when media is present
    text: { type: String, trim: true },

    // Media support
    mediaUrl:  { type: String },                 // absolute URL we save (e.g. http://localhost:5000/uploads/xyz.png)
    mediaType: { type: String, enum: ["image", "audio", null], default: null }
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
