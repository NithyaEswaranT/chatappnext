export default function RoomsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center">
      <div className="max-w-md flex flex-col items-center gap-4">
        {/* Animated icon container */}
        <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-2 relative group hover:border-violet-500/40 transition-all duration-300">
          <div className="absolute inset-0 rounded-2xl bg-violet-600/5 filter blur-lg group-hover:bg-violet-600/10 transition-all"></div>
          <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-200">
          Welcome to ChatFlow
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Select a conversation from the sidebar, or create a brand new room to start chatting in real-time.
        </p>

        {/* Mobile hint */}
        <p className="md:hidden text-xs text-gray-600 flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Tap the menu icon above to see rooms
        </p>
      </div>
    </div>
  );
}
