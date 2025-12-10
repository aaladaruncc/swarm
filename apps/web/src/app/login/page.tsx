"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

  // Redirect if already logged in
  if (session?.user) {
    router.push("/dashboard");
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
        // better-auth signIn returns an object with data or error
        if (res?.error) {
          setError(res.error.message || "Authentication failed");
          setLoading(false);
          return;
        }
        // Only redirect on successful login (no error)
        router.push("/dashboard");
      } else {
        // Sign up
        const res = await signUp.email({ email, password, name });
        if (res?.error) {
           setError(res.error.message || "Signup failed");
           setLoading(false);
           return;
        }
        setSuccess("Account created successfully! Redirecting to login...");
        // Clear form and switch to login after a brief delay
        setTimeout(() => {
          setEmail("");
          setPassword("");
          setName("");
          setIsLogin(true);
          setSuccess("");
        }, 2000);
      }
    } catch (err) {
      // Show error but don't redirect
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      // If we are redirecting (login success), we might want to keep loading true 
      // to prevent flickering before redirect happens, but typically we set it to false if we stay on page.
      // If success login, we redirect, so loading state doesn't matter much as page unmounts.
      // If error, we set loading false.
      if (isLogin && !error) {
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
    <div className="min-h-screen flex bg-white font-sans selection:bg-neutral-900 selection:text-white overflow-hidden">
      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12 relative z-10 bg-white">
        {/* Header */}
        <Link 
          href="/" 
          className="flex items-center gap-2 group w-fit hover:opacity-70 transition-opacity"
        >
          <div className="w-5 h-5 bg-black rounded-sm"></div>
          <span className="text-xl font-medium tracking-tight">Agent<sup className="text-xs ml-0.5">2</sup></span>
        </Link>

        {/* Main Content */}
        <div className="max-w-sm w-full mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-light tracking-tight mb-2 text-neutral-900">
              {isLogin ? "Welcome back" : "Join the simulation"}
            </h1>
            <p className="text-neutral-500 font-light">
              {isLogin ? "Enter your credentials to access the swarm." : "Deploy your first agent swarm today."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-3 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light rounded-none"
                  placeholder="Ada Lovelace"
                  required={!isLogin}
                />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-3 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light rounded-none"
                  placeholder="ada@example.com"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Password</label>
                {isLogin && (
                  <a href="#" className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors">Forgot?</a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-3 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light rounded-none"
                  placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-light border border-red-100"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-light border border-emerald-100"
              >
                {success}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 text-white py-3 hover:bg-neutral-800 transition-all font-medium flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-light text-neutral-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-neutral-900 font-medium hover:underline decoration-neutral-200 underline-offset-4"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-neutral-400 font-light flex gap-6">
          <a href="#" className="hover:text-neutral-900 transition-colors">Privacy</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">Terms</a>
          <span className="ml-auto">© 2024 Agent²</span>
        </div>
      </div>

      {/* Right Column: Visual with 3D Effect */}
      <div className="hidden lg:flex w-1/2 bg-neutral-100 relative items-center justify-center [perspective:2000px] overflow-hidden">
        {/* Background Grid for Depth Perception */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [transform:scale(1.5)] origin-center opacity-50"></div>

        {/* 3D Container */}
        <motion.div 
            initial={{ rotateY: -20, rotateX: 5, opacity: 0, scale: 0.9 }}
            animate={{ rotateY: -12, rotateX: 2, opacity: 1, scale: 0.95 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-[90%] h-[90%] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-neutral-200 relative overflow-hidden"
            style={{ transformStyle: 'preserve-3d' }}
        >
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50"></div>
            
            {/* Animated Radial Gradient */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                className="absolute w-[800px] h-[800px] bg-gradient-radial from-blue-100/40 via-indigo-50/20 to-transparent"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div 
                className="absolute w-[600px] h-[600px] bg-gradient-radial from-purple-100/30 via-pink-50/10 to-transparent"
                animate={{
                  scale: [1.1, 1, 1.1],
                  opacity: [0.2, 0.4, 0.2],
                  x: [0, 20, 0],
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>

            <div className="absolute bottom-12 left-12 right-12 z-20">
              <blockquote className="text-2xl font-light text-neutral-900 leading-snug mb-4 relative">
                "The chaotic testing methodology of Agent² caught a critical race condition in our payment flow that three months of manual QA missed."
              </blockquote>
              <cite className="not-italic text-sm font-medium text-neutral-500">
                — Sarah Chen, VP of Engineering at Nexus
              </cite>
            </div>
            
            {/* Glossy overlay reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none z-30 opacity-50"></div>
        </motion.div>
      </div>
    </div>
  );
}
