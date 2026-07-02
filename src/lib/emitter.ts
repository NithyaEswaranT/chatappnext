import { EventEmitter } from "events";

// Ensure the event emitter is cached globally, similar to the database connection
// to prevent multiple emitter instances during Next.js hot-reloads.
declare global {
  // eslint-disable-next-line no-var
  var chatEmitter: EventEmitter | undefined;
}

const chatEmitter = global.chatEmitter || new EventEmitter();

// Set unlimited listeners to prevent memory warnings in development
chatEmitter.setMaxListeners(0);

if (process.env.NODE_ENV !== "production") {
  global.chatEmitter = chatEmitter;
}

export { chatEmitter };
