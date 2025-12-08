"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, useSession } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (session?.user) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signIn.email({ email, password });
      } else {
        await signUp.email({ email, password, name });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🧪 UX Testing Platform</h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered user experience testing with realistic personas
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-center rounded-l-lg ${
                isLogin
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-center rounded-r-lg ${
                !isLogin
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Your name"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Test your website with AI-powered personas that simulate real users.</p>
          <p className="mt-2">Get actionable UX feedback in minutes.</p>
        </div>
      </div>
    </main>
  );
}
