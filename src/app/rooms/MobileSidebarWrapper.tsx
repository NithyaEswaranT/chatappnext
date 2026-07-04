"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * MobileSidebarWrapper — Client Component
 * ----------------------------------------
 * Wraps the rooms layout to provide mobile-responsive sidebar behaviour:
 *   - Desktop (md+): Sidebar always visible as a fixed side column.
 *   - Mobile (<md): Sidebar is hidden, toggled via a hamburger button.
 *     Clicking the backdrop or navigating to a room closes it.
 *
 * We accept `sidebarContent` as a React node so the parent Server Component
 * can still render all the server-fetched room data inside the sidebar.
 */
export default function MobileSidebarWrapper({
  children,
  sidebarContent,
  desktopUserCard,
}: {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  desktopUserCard: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close sidebar when navigating to a room on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex-1 flex h-screen overflow-hidden relative">
      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col justify-between
          w-[280px] border-r border-white/5 bg-black/60 backdrop-blur-md
          transition-transform duration-300 ease-in-out shrink-0
          md:static md:translate-x-0 md:z-auto md:flex md:w-[300px] md:bg-black/40
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Close button (mobile only) */}
        <button
          className="md:hidden absolute top-4 right-4 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {sidebarContent}
      </aside>

      {/* ── Main content area ── */}
      <main className="flex-1 flex flex-col bg-zinc-950/20 relative min-w-0 overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Open sidebar"
            id="mobile-menu-toggle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            ChatFlow
          </span>
          {/* Online indicator */}
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>

        {children}
      </main>

      {/* Desktop User Profile Badge */}
      <div className="hidden md:block fixed bottom-4 right-4 z-50">
        {desktopUserCard}
      </div>
    </div>
  );
}
