"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Room } from "@/models/Room";
import { User } from "@/models/User";
import {
  hashPassword,
  comparePassword,
  signToken,
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from "@/lib/auth";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────
// Auth Actions
// ─────────────────────────────────────────────────────────────

/**
 * Server Action: Register
 * -----------------------
 * MERN equivalent: POST /api/auth/register
 * 1. Validate inputs
 * 2. Check if user already exists
 * 3. Hash the password with bcrypt
 * 4. Save user to MongoDB
 * 5. Sign a JWT and set it as an HTTP-only cookie
 * 6. Redirect to /rooms
 */
export async function registerAction(formData: FormData) {
  const username = formData.get("username")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  logger.info("RegisterAction (Server)", "Processing registration request", { username, email });

  // — Validation —
  if (!username || !email || !password || !confirmPassword) {
    return { error: "All fields are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, _ and -" };
  }

  try {
    await connectDB();

    // Check if username or email is already taken
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      const field = existingUser.username === username ? "Username" : "Email";
      logger.warn("RegisterAction (Server)", `${field} already taken`);
      return { error: `${field} is already taken.` };
    }

    // Hash the password — NEVER store plain text!
    const hashedPassword = await hashPassword(password);
    logger.info("RegisterAction (Server)", "Password hashed with bcrypt");

    // Save user to MongoDB
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });
    logger.info("RegisterAction (Server)", `New user created in MongoDB: ${newUser._id}`);

    // Sign a JWT token containing the user's identity
    const token = signToken({
      userId: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
    });

    // Set JWT as an HTTP-only cookie
    await setSessionCookie(token);
    logger.info("RegisterAction (Server)", "Session cookie set, redirecting to /rooms");
  } catch (err: any) {
    logger.error("RegisterAction (Server)", "Database error during registration", err);
    return { error: "Registration failed. Please try again." };
  }

  redirect("/rooms");
}

/**
 * Server Action: Login
 * --------------------
 * MERN equivalent: POST /api/auth/login
 * 1. Find the user by username in MongoDB
 * 2. Compare the submitted password against the stored bcrypt hash
 * 3. If valid, sign a new JWT and set the cookie
 * 4. Redirect to /rooms
 */
export async function loginAction(formData: FormData) {
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();

  logger.info("LoginAction (Server)", "Processing login request", { username });

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  try {
    await connectDB();

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      logger.warn("LoginAction (Server)", `Login failed: user '${username}' not found`);
      // Use a generic message so we don't reveal if username exists
      return { error: "Invalid username or password." };
    }

    // Compare the plain password with the stored bcrypt hash
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn("LoginAction (Server)", `Login failed: wrong password for '${username}'`);
      return { error: "Invalid username or password." };
    }

    logger.info("LoginAction (Server)", `Password verified for '${username}', signing JWT`);

    // Sign a fresh JWT
    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    // Set HTTP-only cookie
    await setSessionCookie(token);
    logger.info("LoginAction (Server)", "Login successful, redirecting to /rooms");
  } catch (err: any) {
    logger.error("LoginAction (Server)", "Database error during login", err);
    return { error: "Login failed. Please try again." };
  }

  redirect("/rooms");
}

/**
 * Server Action: Logout
 * ---------------------
 * Simply delete the JWT cookie and redirect to /login.
 */
export async function logoutAction() {
  "use server";
  const session = await getSession();
  logger.info("LogoutAction (Server)", `Logging out user: ${session?.username}`);
  await clearSessionCookie();
  redirect("/login");
}

// ─────────────────────────────────────────────────────────────
// Room Action
// ─────────────────────────────────────────────────────────────

/**
 * Server Action: Create Room
 * --------------------------
 * MERN developers: This function replaces a POST route handler (e.g. router.post('/rooms', ...))
 * It executes entirely on the server.
 *
 * - If it returns an object (e.g. `{ error: ... }`), the client receives it as a standard function return value.
 * - If it succeeds, it invalidates the Next.js router cache using `revalidatePath('/rooms')` so that
 *   the sidebar immediately updates to show the new room, and then redirects the user.
 */
export async function createRoomAction(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || "";

  logger.info("CreateRoomAction (Server)", "Processing room creation request", { name, description });

  if (!name || name.length < 3 || name.length > 30) {
    logger.warn("CreateRoomAction (Server)", "Validation failed: Room name length invalid");
    return { error: "Room name must be between 3 and 30 characters." };
  }

  // Generate URL-friendly slug ID (e.g. "Tech Discussion" -> "tech-discussion")
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  if (!slug) {
    logger.warn("CreateRoomAction (Server)", "Validation failed: Slug generation resulted in empty string");
    return { error: "Invalid room name." };
  }

  try {
    await connectDB();

    const existingRoom = await Room.findById(slug);
    if (existingRoom) {
      logger.warn("CreateRoomAction (Server)", `Room creation aborted: Slug '${slug}' already exists`);
      return { error: "A room with this name already exists." };
    }

    await Room.create({ _id: slug, name, description });
    logger.info("CreateRoomAction (Server)", `Room '${name}' created with ID '${slug}'`);
  } catch (err: any) {
    logger.error("CreateRoomAction (Server)", "Database write failed during room creation", err);
    return { error: "Failed to create room. Make sure MongoDB is running." };
  }

  /**
   * Next.js Revalidation
   * --------------------
   * Tells Next.js to purge its server-side cache for the '/rooms' route segment.
   * The sidebar will immediately show the new room on next render.
   */
  logger.info("CreateRoomAction (Server)", "Triggering cache revalidation for /rooms");
  revalidatePath("/rooms");
  redirect(`/rooms/${slug}`);
}
