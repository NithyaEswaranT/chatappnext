import mongoose, { Schema, Document } from "mongoose";

export interface IRoom {
  _id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

const RoomSchema = new Schema<IRoom>({
  _id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: [true, "Room name is required"],
    unique: true,
    trim: true,
    minlength: [3, "Room name must be at least 3 characters"],
    maxlength: [30, "Room name cannot exceed 30 characters"],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [100, "Description cannot exceed 100 characters"],
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Avoid compiling model again if it exists in hot-reload cache
export const Room = mongoose.models.Room || mongoose.model<IRoom>("Room", RoomSchema);
export default Room;
