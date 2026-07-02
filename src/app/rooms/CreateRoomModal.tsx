"use client";

import { useState, useTransition } from "react";
import { createRoomAction } from "@/app/actions";
import { logger } from "@/lib/logger";

/**
 * Next.js Client Component
 * ------------------------
 * Marked with `"use client"` at the top. This file runs on the client.
 * We can use React state hooks (`useState`) and transitions (`useTransition`).
 */
export default function CreateRoomModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * React 19 useTransition Hook
   * ----------------------------
   * Next.js Server Actions are asynchronous network calls.
   * `useTransition` gives us:
   *   - `isPending`: A boolean indicating if the Server Action is currently executing.
   *   - `startTransition`: A wrapper function to execute the Action.
   * 
   * This is the modern React way to handle loading states without manually setting `setIsLoading(true/false)`.
   */
  const [isPending, startTransition] = useTransition();

  const handleOpen = (val: boolean) => {
    logger.info("CreateRoomModal (Client)", `Toggling modal open status to: ${val}`);
    setIsOpen(val);
    if (!val) setError(null); // Clear errors on close
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const roomName = formData.get("name")?.toString();

    logger.info("CreateRoomModal (Client)", "Form submitted, starting Server Action transition", { roomName });

    // Wrapping the Server Action inside startTransition
    startTransition(async () => {
      const result = await createRoomAction(formData);
      
      if (result && result.error) {
        logger.warn("CreateRoomModal (Client)", `Server Action returned error: ${result.error}`);
        setError(result.error);
      } else {
        logger.info("CreateRoomModal (Client)", "Server Action succeeded, closing modal");
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      {/* Trigger Button */}
      <div className="p-4">
        <button
          onClick={() => handleOpen(true)}
          className="btn-primary w-full text-xs py-2.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Create New Room
        </button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          {/* Modal Content */}
          <div className="glass-panel w-full max-w-md p-6 shadow-2xl relative flex flex-col gap-4 animate-scale-up">
            <button
              onClick={() => handleOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div>
              <h3 className="text-lg font-bold text-gray-200">Create a New Room</h3>
              <p className="text-xs text-gray-400">Rooms are where your discussions happen.</p>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Room Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. general, nodejs-talk"
                  className="glass-input text-xs"
                  minLength={3}
                  maxLength={30}
                  disabled={isPending}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Description (Optional)
                </label>
                <input
                  id="description"
                  name="description"
                  type="text"
                  placeholder="What is this room about?"
                  className="glass-input text-xs"
                  maxLength={100}
                  disabled={isPending}
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full text-xs py-2.5 mt-2"
              >
                {isPending ? "Creating..." : "Create Room"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
