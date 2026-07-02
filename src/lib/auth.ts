/**
 * Auth Utilities (SERVER ONLY)
 * ----------------------------
 * This file is only ever imported in Server Components, Server Actions, Route Handlers,
 * and Middleware. NEVER import this in a Client Component ("use client") file.
 *
 * MERN developers: This is equivalent to your `utils/auth.js` or `middleware/auth.js`
 * in an Express backend.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { SignJWT, jwtVerify } from "jose";


// Load JWT secret from environment. ALWAYS set this in production via .env.local
const JWT_SECRET = process.env.JWT_SECRET || "chatflow-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d"; // Token is valid for 7 days
const COOKIE_NAME = "chatflow_token";
const secret = new TextEncoder().encode(JWT_SECRET);
/**
 * The shape of data we store inside the JWT payload.
 * We include userId and username so server components can identify the user
 * without hitting the database on every request.
 */
export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────
// Password Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Hash a plain-text password using bcrypt.
 * MERN equivalent: bcrypt.hash(password, 10)
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 10; // Higher = more secure but slower
  return bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 * MERN equivalent: bcrypt.compare(password, user.password)
 * Returns true if they match, false otherwise.
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// ─────────────────────────────────────────────────────────────
// JWT Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Sign a JWT token with the user's payload.
 * MERN equivalent: jwt.sign(payload, secret, { expiresIn: '7d' })
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token.
 * Returns the decoded payload if valid, null if expired or tampered.
 * MERN equivalent: jwt.verify(token, secret)
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  if (!token?.length) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch (err) {
    logger.warn("auth.ts", "JWT verification failed", err instanceof Error ? err.message : err);
    return null;
  }
}
// ─────────────────────────────────────────────────────────────
// Session Utilities (Read from Cookie)
// ─────────────────────────────────────────────────────────────

/**
 * Get the current user session from the JWT cookie.
 * Call this in any Server Component, Server Action, or Route Handler
 * to get the currently logged-in user's data.
 *
 * MERN equivalent: req.user (set by your auth middleware after jwt.verify)
 *
 * Returns the user payload if authenticated, null if not.
 */
export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token?.length) {
    logger.warn("auth.ts (getSession)", "No auth token cookie found");
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    logger.warn("auth.ts (getSession)", "Token found but failed verification");
    return null;
  }

  return payload;
}

/**
 * Set the JWT as an HTTP-only cookie in the browser.
 * MERN equivalent: res.cookie('token', jwt, { httpOnly: true })
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,  // JS cannot read this cookie (protects against XSS)
    secure: process.env.NODE_ENV === "production",  // HTTPS only in prod
    sameSite: "lax", // Prevents CSRF
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: "/",
  });
  logger.info("auth.ts (setSessionCookie)", "JWT session cookie set successfully");
}

/**
 * Delete the session cookie (logout).
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  logger.info("auth.ts (clearSessionCookie)", "Session cookie deleted");
}

export { COOKIE_NAME };
