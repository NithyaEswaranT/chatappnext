import mongoose, { Schema, Document } from "mongoose";

/**
 * User Model
 * ----------
 * MERN developers: This is exactly the same as your User model in a MERN app.
 * We store:
 *   - username: a unique display name
 *   - email: unique email for login
 *   - password: a bcrypt HASH (never the plain text!)
 */
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    minlength: [3, "Username must be at least 3 characters"],
    maxlength: [20, "Username cannot exceed 20 characters"],
    // Only allow URL-friendly characters (letters, numbers, underscores, hyphens)
    match: [/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _ and -"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Avoid compiling model again if it exists in hot-reload cache
export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
