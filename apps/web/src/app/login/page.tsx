"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedGradientCurtain } from "@/components/ui/animated-gradient-curtain";

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
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-neutral-950 p-4 font-sans selection:bg-blue-500/30 selection:text-white">
      {/* Background Effects matching Hero */}
      <AnimatedGradientCurtain
        colors={[
          "rgba(0, 0, 0, 0.8)",    // Deep black/blue
          "rgba(20, 20, 30, 0.8)", // Dark navy
          "rgba(0, 0, 0, 0.8)",    // Deep black
          "rgba(20, 20, 30, 0.8)", // Dark navy (loop)
        ]}
        speed={15}
        meshOpacity={0.05}
        meshSize={40}
      />
      
      {/* Additional dark lighting effects */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(30, 41, 59, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(15, 23, 42, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.5) 0%, transparent 70%)
          `,
        }}
      />

      {/* Main Container */}
      <div className="w-full max-w-5xl shadow-2xl overflow-hidden flex relative z-10 border border-white/10 rounded-lg backdrop-blur-md bg-slate-950/50">
        
        {/* Left Side - Login Form */}
        <div className="w-full lg:w-7/12 flex flex-col justify-center p-8 lg:p-12">
          <div className="max-w-md mx-auto w-full">
            {/* Logo */}
            <Link
              href="/"
              className="mb-8 hover:opacity-80 transition-opacity inline-flex items-center -ml-[2px]"
            >
              <Image
                src="/images/swarm_logo_white.png"
                alt="Swarm"
                width={140}
                height={48}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>

            <div className="mb-8">
              <h1 className="text-3xl lg:text-4xl font-sans font-light tracking-tight mb-2 text-white">
                {isLogin ? "Welcome back" : "Get started"}
              </h1>
              <p className="text-slate-400 font-sans font-light">
                {isLogin ? "Sign in to access your dashboard" : "Create your account to begin testing"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 rounded-lg font-light"
                        placeholder="Ada Lovelace"
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 rounded-lg font-light"
                  placeholder="test@example.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Password</label>
                  {isLogin && (
                    <a href="#" className="text-xs font-light text-slate-500 hover:text-white transition-colors">Forgot password?</a>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 rounded-lg font-light"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-500/10 text-red-400 text-sm font-light border border-red-500/20 rounded-lg flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-500/10 text-emerald-400 text-sm font-light border border-emerald-500/20 rounded-lg flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {success}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-slate-900 py-2.5 text-sm hover:bg-white/90 transition-all font-medium flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-2 rounded-lg shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign in" : "Create account"}
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm font-light text-slate-500">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-white font-medium hover:underline decoration-white/20 underline-offset-4 transition-colors"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="hidden lg:block lg:w-5/12 relative bg-slate-900 min-h-[640px]">
          <Image
            src="/images/loginpage_image4.jpg"
            alt="Swarm"
            fill
            className="object-cover opacity-80"
            priority
            quality={95}
          />
          {/* Overlay to blend image with dark theme */}
          <div className="absolute inset-0 bg-slate-950/20" />
        </div>
      </div>
    </div>
  );
}
