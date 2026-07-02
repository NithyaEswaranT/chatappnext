import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Room } from "@/models/Room";
import { Message } from "@/models/Message";
import ChatClient from "./ChatClient";
import { logger } from "@/lib/logger";
import { getSession } from "@/lib/auth";
interface RoomPageProps {
  // In Next.js 15+, dynamic route parameters are returned as a Promise.
  // We must await it to get the parameter values.
  params: Promise<{
    roomId: string;
  }>;
}

/**
 * Next.js Dynamic Route Segment: /rooms/[roomId]
 * -----------------------------------------------
 * This Server Component represents the chat room page.
 * It is dynamically rendered because it reads the cookie and queries the DB.
 */
export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;
  
  logger.info("RoomPage (Server)", `Loading room page segment for: ${roomId}`);
 const session = await getSession();

  if (!session?.username?.length) {
    logger.warn("RoomsLayout (Server)", "No valid session found, redirecting to login page");
    redirect("/");
  }

  const username = session.username;

  if (!username) {
    logger.warn("RoomPage (Server)", "No active username cookie found, redirecting to login");
    redirect("/");
  }

  try {
    // 1. Establish database connection securely on the server
    await connectDB();
    
    // 2. Fetch the room's details from MongoDB
    const room = await Room.findById(roomId);
    if (!room) {
      logger.warn("RoomPage (Server)", `Room with ID '${roomId}' not found in database, redirecting to /rooms`);
      redirect("/rooms");
    }

    // 3. Fetch the last 50 messages from MongoDB for this room
    logger.info("RoomPage (Server)", `Fetching message history from MongoDB for room: ${roomId}`);
    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(50);

    /**
     * Mongoose Serialization Rule
     * ---------------------------
     * Next.js Server Components cannot pass raw Class instances (like Mongoose documents)
     * or custom BSON classes (like ObjectIds) directly to Client Components.
     * 
     * We must serialize the Mongoose docs into plain JavaScript objects (strings, numbers, simple arrays)
     * before passing them as React props.
     */
    const serializedMessages = messages.map((msg) => ({
      _id: msg._id.toString(),
      sender: msg.sender,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }));

    logger.info(
      "RoomPage (Server)",
      `Successfully loaded room '${room.name}' and ${serializedMessages.length} messages. Sending to ChatClient...`
    );

    return (
      <ChatClient
        roomId={roomId}
        username={username}
        roomName={room.name}
        initialMessages={serializedMessages}
      />
    );
  } catch (err) {
    logger.error("RoomPage (Server)", `Failed to load data for room: ${roomId}`, err);
    // Graceful fallback: send them back to the main rooms directory
    redirect("/rooms");
  }
}
