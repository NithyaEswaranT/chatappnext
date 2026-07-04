"use client";

import { useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

interface Message {
  _id: string;
  sender: string;
  content: string;
  clientMsgId?: string;
  createdAt: string;
}

interface ChatClientProps {
  roomId: string;
  username: string;
  roomName: string;
  initialMessages: Message[];
}

/**
 * ChatClient - Client Component
 * ----------------------------
 * Handles real-time SSE subscriptions, optimistic state rendering, and message posting.
 */
export default function ChatClient({
  roomId,
  username,
  roomName,
  initialMessages,
}: ChatClientProps) {
  // 1. Initialize state with historical messages fetched on the server
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat window to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Real-Time Stream Hook (Server-Sent Events)
   * -------------------------------------------
   * We use the browser's native EventSource API to subscribe to the server stream.
   * This is a one-way HTTP stream. When the server pushes a message, `onmessage` fires.
   */
  useEffect(() => {
    logger.info("ChatClient (Client)", `Connecting to Server-Sent Events stream for room: ${roomId}`);
    setStatus("connecting");
    
    // Connect to Next.js API Route Handler stream
    const eventSource = new EventSource(`/api/rooms/${roomId}/stream`);

    eventSource.onopen = () => {
      logger.info("ChatClient (Client)", `SSE stream connection successfully opened for room: ${roomId}`);
      setStatus("connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const newMessage = JSON.parse(event.data);
        logger.info("ChatClient (Client)", "SSE stream received new message", { newMessage });
        
        setMessages((prev) => {
          /**
           * Deduplication Strategy (The fix for the double-message bug!)
           * -------------------------------------------------------------
           * Problem: When YOU send a message, two things happen simultaneously:
           *   1. The optimistic message (with tempId) is already shown in state.
           *   2. The server emits via SSE — which also fires on YOUR browser.
           * 
           * The old check `m._id === newMessage._id` fails because the optimistic
           * message still has a `tempId`, not the real MongoDB `_id`.
           *
           * Fix: We attach a `clientMsgId` (= our tempId) when POSTing.
           * The server saves it and returns it in the SSE broadcast.
           * So when SSE arrives, we check if ANY existing message already
           * has that same clientMsgId — meaning WE sent it optimistically.
           * If yes, we REPLACE it (swap tempId entry with real server entry).
           * If no, it's a message from another user → append it normally.
           */
          const optimisticIndex = prev.findIndex(
            (m) => newMessage.clientMsgId && m._id === newMessage.clientMsgId
          );

          if (optimisticIndex !== -1) {
            // Found the optimistic message from the sender — replace it with the server version
            logger.info("ChatClient (Client)", `Replacing optimistic message (${newMessage.clientMsgId}) with saved version (${newMessage._id})`);
            const updated = [...prev];
            updated[optimisticIndex] = newMessage;
            return updated;
          }

          // Also guard against a pure _id duplicate (shouldn't happen now, but safety net)
          if (prev.some((m) => m._id === newMessage._id)) {
            logger.info("ChatClient (Client)", "Exact duplicate _id detected, skipping");
            return prev;
          }

          // New message from another user — append it
          return [...prev, newMessage];
        });
      } catch (err) {
        logger.error("ChatClient (Client)", "Failed to parse incoming SSE message JSON", err);
      }
    };

    eventSource.onerror = (err) => {
      logger.error("ChatClient (Client)", `SSE stream connection lost for room: ${roomId}`, err);
      setStatus("disconnected");
      eventSource.close();
    };

    // Cleanup: Close HTTP stream when moving to a different room or logging out
    return () => {
      logger.info("ChatClient (Client)", `Cleaning up SSE connection for room: ${roomId}`);
      eventSource.close();
    };
  }, [roomId]);

  /**
   * Sending a Message
   * -----------------
   * 1. Generate a `clientMsgId` = the tempId used in the optimistic message.
   * 2. POST it to the API (server saves it + emits SSE with clientMsgId attached).
   * 3. SSE fires back → deduplication uses clientMsgId to replace optimistic entry.
   *    No more duplicate!
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    setInput("");

    // Use tempId as both the optimistic _id AND the clientMsgId sent to the server
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMessage: Message = {
      _id: tempId,
      clientMsgId: tempId,
      sender: username,
      content,
      createdAt: new Date().toISOString(),
    };
    
    logger.info("ChatClient (Client)", "Adding message optimistically", { tempId, content });
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      logger.info("ChatClient (Client)", `POSTing message to /api/rooms/${roomId}/messages`);
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send clientMsgId so server includes it in the SSE broadcast
        body: JSON.stringify({ content, sender: username, clientMsgId: tempId }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const savedMessage = await response.json();
      logger.info("ChatClient (Client)", "Message saved in MongoDB", { savedId: savedMessage._id });

      /**
       * Note: We do NOT manually replace the optimistic message here anymore.
       * The SSE event (which fires for the sender too) will replace it via the
       * clientMsgId deduplication logic above. This keeps a single source of truth.
       */
    } catch (err) {
      logger.error("ChatClient (Client)", "Failed to send message, rolling back optimistic update", err);
      
      // Rollback: Remove the optimistic message from the feed if network fails
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      alert("Failed to send message. Please check your network connection.");
    }
  };


  return (
    <div className="flex-1 flex flex-col h-[100dvh] md:h-screen overflow-hidden">
      {/* Room Header — hidden on mobile (top bar already shows ChatFlow brand) */}
      <header className="hidden md:flex px-6 py-4 border-b border-white/5 bg-black/10 items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-violet-400 font-bold text-lg shrink-0">#</span>
          <h1 className="text-md font-bold text-gray-200 truncate">{roomName}</h1>
          <span className="text-xs text-gray-500 hidden lg:inline shrink-0">• ID: {roomId}</span>
        </div>

        {/* Real-time Connection Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              status === "connected"
                ? "bg-emerald-500 animate-pulse"
                : status === "connecting"
                ? "bg-amber-500 animate-pulse"
                : "bg-red-500"
            }`}
          ></span>
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
            {status}
          </span>
        </div>
      </header>

      {/* Mobile-only room header strip */}
      <div className="md:hidden px-4 py-2 border-b border-white/5 bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-violet-400 font-bold">#</span>
          <span className="text-sm font-semibold text-gray-200 truncate">{roomName}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === "connected"
                ? "bg-emerald-500 animate-pulse"
                : status === "connecting"
                ? "bg-amber-500 animate-pulse"
                : "bg-red-500"
            }`}
          ></span>
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
            {status}
          </span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-3 py-4 md:p-6 flex flex-col gap-3 md:gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-gray-500 text-sm">No messages yet in this room.</p>
            <p className="text-xs text-gray-600">Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === username;
            return (
              <div
                key={msg._id}
                className={`flex flex-col max-w-[85%] md:max-w-[70%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {/* Sender Name */}
                {!isMe && (
                  <span className="text-[10px] font-bold text-violet-400 mb-1 px-1">
                    {msg.sender}
                  </span>
                )}
                
                {/* Message Bubble */}
                <div
                  className={`px-3.5 py-2 md:px-4 md:py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? "bg-violet-600 text-white rounded-br-none shadow-md shadow-violet-600/10"
                      : "bg-white/5 border border-white/5 text-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-gray-500 mt-1 px-1" suppressHydrationWarning>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <footer className="px-3 py-3 md:py-4 md:pl-6 md:pr-[245px] bg-black/10 border-t border-white/5 safe-bottom">
        <form onSubmit={handleSendMessage} className="flex gap-2 w-full max-w-4xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${roomName}...`}
            className="glass-input flex-1 text-sm py-2.5 md:py-3"
            maxLength={1000}
          />
          <button
            type="submit"
            className="btn-primary px-3 md:px-5 shrink-0"
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <span className="hidden sm:inline">Send</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
}
