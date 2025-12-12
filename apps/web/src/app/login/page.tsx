"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await signIn.email({ email, password });
        
        if (res?.error) {
          setError(res.error.message || "Authentication failed");
          setLoading(false);
          return;
        }
        
        setLoginSuccess(true);
        
        // Wait a moment for cookies to be set, then use window.location for full page reload
        // This ensures cookies are properly sent with the next request
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use window.location.href for full page reload to ensure cookies are sent
        window.location.href = "/dashboard";
      } else {
        const res = await signUp.email({ email, password, name });
        if (res?.error) {
           setError(res.error.message || "Signup failed");
           setLoading(false);
           return;
        }
        setSuccess("Account created successfully! Redirecting to login...");
        setTimeout(() => {
          setEmail("");
          setPassword("");
          setName("");
          setIsLogin(true);
          setSuccess("");
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      // Check if it's a network error
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("ERR_CONNECTION_REFUSED") || errorMessage.includes("NetworkError")) {
        setError("Cannot connect to server. Please make sure the API server is running on port 8080.");
      } else {
        setError(errorMessage);
      }
      setLoading(false);
    } finally {
      if (isLogin && loginSuccess) {
         // keep loading if successful login to avoid flash
      } else {
         setLoading(false);
      }
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-neutral-900">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      <div className="w-full max-w-lg px-8 relative z-10 flex flex-col items-center">
        {/* Logo */}
        <Link 
          href="/" 
          className="mb-8 hover:opacity-80 transition-opacity"
        >
          <Image 
            src="/images/vantage_small.png" 
            alt="Vantage" 
            width={120} 
            height={120}
            className="h-16 w-auto object-contain"
          />
        </Link>

        {/* Card */}
        <div className="w-full bg-white border border-neutral-200 shadow-xl shadow-neutral-200/40 p-8 md:p-10 lg:p-12">
          <div className="mb-6 text-center">
            <h1 className="text-2xl md:text-3xl font-serif font-normal tracking-tight mb-2 text-neutral-900">
              {isLogin ? "Welcome back" : "Join the simulation"}
            </h1>
            <p className="text-sm text-neutral-500 font-sans font-light">
              {isLogin ? "Enter your credentials to access the swarm." : "Deploy your first agent swarm today."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-sans font-medium text-neutral-900 uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 px-5 py-3 text-base focus:border-neutral-900 focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-sans font-light"
                  placeholder="Ada Lovelace"
                  required={!isLogin}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-sans font-medium text-neutral-900 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 px-5 py-3 text-base focus:border-neutral-900 focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-sans font-light"
                  placeholder="ada@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-sans font-medium text-neutral-900 uppercase tracking-wide">Password</label>
                {isLogin && (
                  <a href="#" className="text-xs font-sans font-light text-neutral-500 hover:text-neutral-900 transition-colors">Forgot?</a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 px-5 py-3 text-base focus:border-neutral-900 focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-sans font-light"
                  placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 text-red-600 text-sm font-sans font-light border border-red-100"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 text-emerald-600 text-sm font-sans font-light border border-emerald-100"
              >
                {success}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 text-white py-3 text-base hover:bg-neutral-800 transition-all font-sans font-light flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-sans font-light text-neutral-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-neutral-900 font-normal hover:underline decoration-neutral-200 underline-offset-4"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}