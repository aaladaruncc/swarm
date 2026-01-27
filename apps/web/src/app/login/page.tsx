"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signIn, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import posthog from "posthog-js";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isPending && session?.user) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  if (session?.user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn.email({ email, password });

      if (res?.error) {
        setError(res.error.message || "Authentication failed");
        setLoading(false);
        return;
      }

      setLoginSuccess(true);

      // Identify user in PostHog and capture sign-in event
      posthog.identify(email, {
        email: email,
      });
      posthog.capture("user_signed_in", {
        email: email,
      });

      // Wait a moment for cookies to be set, then use window.location for full page reload
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use window.location.href for full page reload to ensure cookies are sent
      window.location.href = "/dashboard";
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        setError("Cannot connect to server. Please make sure the API server is running on port 8080.");
      } else {
        setError(errorMessage);
      }
      setLoading(false);
    } finally {
      if (loginSuccess) {
        // keep loading if successful login to avoid flash
      } else {
        setLoading(false);
      }
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  return (
    <AuroraBackground className="font-sans selection:bg-blue-500/30 selection:text-slate-900">
      <div className="relative z-10 w-full max-w-md mx-auto p-4">
        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 p-8 md:p-10"
        >
          {/* Logo */}
          <Link
            href="/"
            className="mb-8 hover:opacity-80 transition-opacity inline-flex items-center"
          >
            <Image
              src="/images/swarm_logo_black.png"
              alt="Swarm"
              width={140}
              height={48}
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-sans font-light tracking-tight mb-2 text-slate-900">
              Welcome back
            </h1>
            <p className="text-slate-500 font-sans font-light">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 rounded-xl font-light"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Password</label>
                <a href="#" className="text-xs font-light text-slate-400 hover:text-slate-700 transition-colors">Forgot password?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 rounded-xl font-light"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 text-red-600 text-sm font-light border border-red-100 rounded-xl flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 text-sm hover:bg-slate-800 transition-all font-medium flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-2 rounded-xl shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm font-light text-slate-400">
            Need access?{" "}
            <a
              href="https://cal.com/team/swarm/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 font-medium hover:text-blue-600 transition-colors"
            >
              Book a demo
            </a>
          </div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
}
