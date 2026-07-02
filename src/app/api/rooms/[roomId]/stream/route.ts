import { chatEmitter } from "@/lib/emitter";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{
    roomId: string;
  }>;
}

/**
 * Next.js Route Handler: GET /api/rooms/[roomId]/stream
 * ------------------------------------------------------
 * MERN developers: This sets up a persistent HTTP connection using Server-Sent Events (SSE).
 * It opens a Web Standard ReadableStream, sending text/event-stream chunks down the pipeline.
 * 
 * Client -> Server connection remains open indefinitely.
 */
export async function GET(request: Request, context: RouteContext) {
  const { roomId } = await context.params;

  logger.info("API Stream (GET)", `Request received to open SSE stream connection for room: ${roomId}`);

  const stream = new ReadableStream({
    start(controller) {
      // 1. Define the event listener callback
      const onMessage = (message: any) => {
        // SSE formatting requires: "data: <JSON-string>\n\n"
        const formattedData = `data: ${JSON.stringify(message)}\n\n`;
        try {
          logger.info("API Stream (GET)", `Enqueuing new message event into stream for room: ${roomId}`);
          controller.enqueue(new TextEncoder().encode(formattedData));
        } catch (e) {
          logger.error("API Stream (GET)", "Failed to push message data to stream controller", e);
        }
      };

      // 2. Register the emitter listener
      logger.info("API Stream (GET)", `Registering emitter subscriber for: message:${roomId}`);
      chatEmitter.on(`message:${roomId}`, onMessage);

      // 3. Send initial connection heartbeat comment (starts with a colon ':')
      controller.enqueue(new TextEncoder().encode(":\n\n"));

      // 4. Send a heartbeat ping every 20 seconds to keep connection alive
      // (Serverless environments will close connections if there's no activity)
      const heartbeat = setInterval(() => {
        try {
          // Send SSE comment heartbeat
          controller.enqueue(new TextEncoder().encode(":\n\n"));
        } catch (e) {
          logger.warn("API Stream (GET)", `Heartbeat failed, clearing interval for room: ${roomId}`);
          clearInterval(heartbeat);
        }
      }, 20000);

      // 5. Detect when client cancels/disconnects (e.g. closes the tab, leaves the room)
      request.signal.addEventListener("abort", () => {
        logger.info("API Stream (GET)", `Client connection abort signal received for room: ${roomId}`);
        
        // Remove listener to prevent memory leaks!
        chatEmitter.off(`message:${roomId}`, onMessage);
        clearInterval(heartbeat);
        
        try {
          controller.close();
          logger.info("API Stream (GET)", `Stream controller closed cleanly for room: ${roomId}`);
        } catch (e) {
          // Stream might have already been closed
        }
      });
    },
  });

  // Return the stream with standard SSE HTTP headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
