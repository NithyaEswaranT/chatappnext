import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chatflow";

// Ensure global type safety for Mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}
//log
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  const activeCache = cached!;
  
  if (activeCache.conn) {
    return activeCache.conn;
  }

  if (!activeCache.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log("Creating new MongoDB connection pool...");
    activeCache.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log("MongoDB connected successfully.");
      return m;
    });
  }

  try {
    activeCache.conn = await activeCache.promise;
  } catch (e) {
    activeCache.promise = null;
    console.error("MongoDB connection error:", e);
    throw e;
  }

  return activeCache.conn;
}
