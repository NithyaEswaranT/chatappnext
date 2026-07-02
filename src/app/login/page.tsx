"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions";
import { logger } from "@/lib/logger";

/**
 * Login Page — Client Component
 * ------------------------------
 * We use "use client" here so we can manage form errors in local state
 * and show a loading spinner using `useTransition`.
 */
export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    logger.info("LoginPage (Client)", "Login form submitted");

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        logger.warn("LoginPage (Client)", `Login error: ${result.error}`);
        setError(result.error);
      }
      // On success, the Server Action calls redirect() so the page navigates automatically
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      {/* Ambient glow blobs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full filter blur-3xl pointer-events-none" />

      <div className="glass-panel w-full max-w-md p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
        {/* Inner glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-violet-600/20 filter blur-2xl" />

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-1">
            ChatFlow
          </h1>
          <p className="text-gray-400 text-sm">Sign in to your account</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 animate-fade-in">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoFocus
              placeholder="Enter your username"
              className="glass-input text-sm"
              disabled={isPending}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Enter your password"
              className="glass-input text-sm"
              disabled={isPending}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full py-3 text-sm mt-1"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Register Link */}
        <p className="text-center text-xs text-gray-500 border-t border-white/5 pt-4">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
