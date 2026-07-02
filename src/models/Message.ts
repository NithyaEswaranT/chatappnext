import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  roomId: string;
  sender: string;
  content: string;
  clientMsgId?: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  roomId: {
    type: String,
    required: [true, "Room ID is required"],
    index: true,
  },
  sender: {
    type: String,
    required: [true, "Sender name is required"],
    trim: true,
  },
  content: {
    type: String,
    required: [true, "Message content is required"],
    trim: true,
    maxlength: [1000, "Message content cannot exceed 1000 characters"],
  },
  clientMsgId: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Avoid compiling model again if it exists in hot-reload cache
export const Message = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
export default Message;
