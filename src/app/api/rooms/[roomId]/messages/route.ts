import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import { chatEmitter } from "@/lib/emitter";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{
    roomId: string;
  }>;
}

/**
 * Next.js Route Handler: POST /api/rooms/[roomId]/messages
 * --------------------------------------------------------
 * MERN developers: This takes the place of Express routing (app.post('/api/rooms/:roomId/messages', ...))
 * We export a named async function corresponding to the HTTP method.
 */
export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  
  logger.info("API Messages (POST)", `Processing new incoming message request for room: ${roomId}`);

  try {
    // Read the request body. Next.js wraps the Web Standard Request object,
    // so we call `await request.json()` instead of relying on body-parser middleware.
    const { content, sender, clientMsgId } = await request.json();

    if (!content || !sender) {
      logger.warn("API Messages (POST)", "Validation failed: Content or sender missing", { content, sender });
      return NextResponse.json(
        { error: "Content and sender are required." },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Write the Message document to MongoDB
    const newMessage = await Message.create({
      roomId,
      sender,
      content,
      clientMsgId,
    });

    const serializedMessage = {
      _id: newMessage._id.toString(),
      sender: newMessage.sender,
      content: newMessage.content,
      clientMsgId: newMessage.clientMsgId,
      createdAt: newMessage.createdAt.toISOString(),
    };

    logger.info("API Messages (POST)", `Message saved in MongoDB. ID: ${serializedMessage._id}`);

    /**
     * Pub/Sub Broadcasting
     * --------------------
     * Once saved in MongoDB, we broadcast this message using our global EventEmitter instance.
     * This pushes the message data to the SSE stream GET connection running in the other route.
     */
    logger.info("API Messages (POST)", `Broadcasting event 'message:${roomId}'`);
    chatEmitter.emit(`message:${roomId}`, serializedMessage);

    return NextResponse.json(serializedMessage, { status: 201 });
  } catch (err) {
    logger.error("API Messages (POST)", `Failed to post message for room: ${roomId}`, err);
    return NextResponse.json(
      { error: "Failed to save message." },
      { status: 500 }
    );
  }
}
