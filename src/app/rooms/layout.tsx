import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Room } from "@/models/Room";
import CreateRoomModal from "./CreateRoomModal";
import { logger } from "@/lib/logger";
import { getSession, clearSessionCookie } from "@/lib/auth";
import MobileSidebarWrapper from "./MobileSidebarWrapper";

/**
 * Next.js Nested Layout
 * ---------------------
 * In Next.js, layouts are persistent wrappers. When you navigate between `/rooms`
 * and `/rooms/tech`, the sidebar (rendered here) stays mounted, avoiding re-renders.
 * Only the `{children}` on the right side swap out.
 * 
 * Because this layout is a Server Component, it fetches the list of rooms from MongoDB
 * on the server, rendering it into the HTML before sending it to the client.
 */
export default async function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  logger.info("RoomsLayout (Server)", "Rendering main application dashboard");

  const session = await getSession();

  if (!session?.username?.length) {
    logger.warn("RoomsLayout (Server)", "No valid session found, redirecting to login page");
    redirect("/");
  }

  const username = session.username;

  if (!username) {
    logger.warn("RoomsLayout (Server)", "No username session cookie found, redirecting to login page");
    redirect("/");
  }

  // Connect to MongoDB and fetch all rooms
  let rooms: any[] = [];
  let dbError = false;
  
  try {
    logger.info("RoomsLayout (Server)", "Querying MongoDB for available rooms");
    await connectDB();
    // Sort oldest to newest (by creation date) so new rooms append at the bottom
    rooms = await Room.find().sort({ createdAt: 1 });
    logger.info("RoomsLayout (Server)", `Successfully fetched ${rooms.length} rooms`);
  } catch (err) {
    logger.error("RoomsLayout (Server)", "Failed to fetch rooms from MongoDB database", err);
    dbError = true;
  }

  /**
   * Server Action: Logout
   * Deletes the user session cookie on the server and redirects.
   */
  async function logoutAction() {
    "use server";
    logger.info("LogoutAction (Server Action)", `Logging out user '${username}'`);
    await clearSessionCookie();
    redirect("/login");
  }

  // Sidebar content is extracted so it can be passed to the client wrapper
  const sidebarContent = (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <Link href="/rooms" className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent hover:opacity-90 transition">
            ChatFlow
          </Link>
          <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
            v1.0
          </span>
        </div>

        {/* 
          Create Room Modal component.
          This is a CLIENT component nested inside a SERVER component layout. 
          Next.js allows this perfectly! This lets us keep the heavy room fetching on the server,
          while delegating interactive modal toggles to the client.
        */}
        <div className="shrink-0">
          <CreateRoomModal />
        </div>

        {/* Rooms List */}
        <div className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto min-h-0">
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Rooms Available
          </div>

          {dbError && (
            <div className="px-3 py-2 text-xs text-red-400 bg-red-500/5 rounded-lg border border-red-500/10">
              DB offline. Start MongoDB locally or set MONGODB_URI.
            </div>
          )}

          {!dbError && rooms.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500 italic">
              No rooms yet. Create one!
            </div>
          )}

          {rooms.map((room) => (
            <Link
              key={room._id.toString()}
              href={`/rooms/${room._id}`}
              className="group flex flex-col gap-0.5 px-4 py-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all shrink-0"
            >
              <span className="text-sm font-medium text-gray-200 group-hover:text-violet-400 transition-colors">
                # {room.name}
              </span>
              {room.description && (
                <span className="text-xs text-gray-500 line-clamp-1">
                  {room.description}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* User Info & Logout Footer - visible on mobile only */}
      <div className="md:hidden p-4 border-t border-white/5 bg-black/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-xs uppercase text-white shrink-0 shadow-md shadow-violet-500/20">
            {username.slice(0, 2)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-gray-200 truncate">{username}</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              online
            </span>
          </div>
        </div>

        <form action={logoutAction} className="shrink-0">
          <button
            type="submit"
            title="Logout"
            className="p-2 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );

  const desktopUserCard = (
    <div className="flex items-center gap-3 p-3 bg-black/60 border border-white/10 rounded-xl backdrop-blur-md shadow-lg shadow-black/40">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-xs uppercase text-white shadow-md shadow-violet-500/20">
        {username.slice(0, 2)}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-gray-200 truncate">{username}</span>
        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          online
        </span>
      </div>
      <form action={logoutAction} className="shrink-0 border-l border-white/10 pl-2">
        <button
          type="submit"
          title="Logout"
          className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </form>
    </div>
  );

  return (
    <MobileSidebarWrapper
      sidebarContent={sidebarContent}
      desktopUserCard={desktopUserCard}
    >
      {children}
    </MobileSidebarWrapper>
  );
}
