/**
 * ChatFlow Logging Utility
 * Helps MERN stack developers trace lifecycle events in Next.js Server Components,
 * Server Actions, Route Handlers, and Client Components.
 */
export const logger = {
  info: (context: string, message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : "";
    console.log(`🟢 [${timestamp}] [${context}] ${message}${dataStr}`);
  },
  warn: (context: string, message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : "";
    console.warn(`🟡 [${timestamp}] [${context}] ${message}${dataStr}`);
  },
  error: (context: string, message: string, error?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const errStr = error instanceof Error ? error.stack || error.message : JSON.stringify(error);
    console.error(`🔴 [${timestamp}] [${context}] ERROR: ${message} | ${errStr}`);
  }
};
