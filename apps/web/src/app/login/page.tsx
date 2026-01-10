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
      <div className="min-h-screen flex items-center justify-center bg-white text-neutral-900">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 font-sans selection:bg-neutral-900 selection:text-white p-4">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="w-full max-w-5xl bg-white shadow-2xl overflow-hidden flex min-h-[720px] relative z-10 border border-neutral-100 rounded-none">
        {/* Left Side - Login Form */}
        <div className="w-full lg:w-7/12 flex flex-col justify-center p-8 lg:p-16 relative">
          <div className="max-w-md mx-auto w-full">
            {/* Logo */}
            <Link 
              href="/" 
              className="mb-10 hover:opacity-80 transition-opacity inline-flex items-center -ml-[2px]"
            >
              <Image 
                src="/images/swarm_small.png" 
                alt="Swarm" 
                width={120} 
                height={40}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>

            <div className="mb-10">
              <h1 className="text-3xl lg:text-4xl font-serif font-medium tracking-tight mb-3 text-neutral-900">
                {isLogin ? "Welcome back" : "Get started"}
              </h1>
              <p className="text-neutral-500 font-sans font-light">
                {isLogin ? "Sign in to access your dashboard" : "Create your account to begin testing"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 min-h-[320px]">
              {!isLogin ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 uppercase tracking-wide">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-2.5 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all placeholder:text-neutral-400 rounded-none font-light"
                    placeholder="Ada Lovelace"
                    required={!isLogin}
                  />
                </div>
              ) : (
                <div className="h-[74px]" aria-hidden />
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-2.5 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all placeholder:text-neutral-400 rounded-none font-light"
                  placeholder="ada@example.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-neutral-700 uppercase tracking-wide">Password</label>
                  {isLogin && (
                    <a href="#" className="text-xs font-light text-neutral-500 hover:text-neutral-900 transition-colors">Forgot password?</a>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-2.5 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all placeholder:text-neutral-400 rounded-none font-light"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 text-red-600 text-sm font-light border border-red-100 rounded-none flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-50 text-emerald-600 text-sm font-light border border-emerald-100 rounded-none flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {success}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-900 text-white py-2.5 text-sm hover:bg-neutral-800 transition-all font-medium flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-2 rounded-none shadow-sm"
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

            <div className="mt-8 text-center text-sm font-light text-neutral-500">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-neutral-900 font-medium hover:underline decoration-neutral-200 underline-offset-4 transition-colors"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="hidden lg:block lg:w-5/12 relative bg-neutral-900">
          <Image
            src="/images/loginpage_image2.png"
            alt="Swarm"
            fill
            className="object-cover"
            priority
            quality={95}
          />
        </div>
      </div>
    </div>
  );
}