"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut, authClient } from "@/lib/auth-client";
import { User, Mail, LogOut, Loader2, Check, Bell, BellOff } from "lucide-react";
import { useState, useEffect } from "react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
} from "@/lib/notifications";
import { useTheme } from "@/contexts/theme-context";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [usageStats, setUsageStats] = useState<{
    month: { totalTokens: number; liveTokens: number; screenshotTokens: number };
    allTime: { totalTokens: number; liveTokens: number; screenshotTokens: number };
  } | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  
  // Notification state
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  const isLight = theme === "light";

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    const loadUsage = async () => {
      setUsageLoading(true);
      setUsageError(null);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/user/me/usage`,
          {
            credentials: "include",
          }
        );
        if (!response.ok) {
          throw new Error("Failed to load usage");
        }
        const data = await response.json();
        setUsageStats(data);
      } catch (error: any) {
        setUsageError(error.message || "Failed to load usage");
      } finally {
        setUsageLoading(false);
      }
    };

    loadUsage();
  }, [session?.user]);

  useEffect(() => {
    if (isNotificationSupported()) {
      const permission = getNotificationPermission();
      const enabled = isNotificationsEnabled();
      setNotificationPermission(permission);
      setNotificationsEnabledState(enabled);
      
      // If permission was granted but we don't have it stored, update it
      if (permission === "granted" && !enabled) {
        setNotificationsEnabled(true);
        setNotificationsEnabledState(true);
      }
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleToggleNotifications = async () => {
    if (!isNotificationSupported()) {
      setMessage({ type: "error", text: "Browser notifications are not supported in this browser." });
      return;
    }

    if (!notificationsEnabled) {
      // Turning on - request permission
      setIsRequestingPermission(true);
      try {
        const permission = await requestNotificationPermission();
        setNotificationPermission(permission);

        if (permission === "granted") {
          setNotificationsEnabledState(true);
          setNotificationsEnabled(true);
          setMessage({ type: "success", text: "Notifications enabled! You'll be notified when your test runs complete." });
        } else if (permission === "denied") {
          setMessage({ type: "error", text: "Notification permission was denied. Please enable it in your browser settings." });
        } else {
          setMessage({ type: "error", text: "Notification permission was not granted." });
        }
      } catch (error) {
        console.error("Error requesting notification permission:", error);
        setMessage({ type: "error", text: "Failed to request notification permission." });
      } finally {
        setIsRequestingPermission(false);
      }
    } else {
      // Turning off
      setNotificationsEnabledState(false);
      setNotificationsEnabled(false);
      setMessage({ type: "success", text: "Notifications disabled." });
    }
  };


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const updates: any = {};
      
      if (name !== session?.user?.name) {
        updates.name = name;
      }

      if (email !== session?.user?.email) {
        updates.email = email;
      }

      if (Object.keys(updates).length === 0) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/user/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }
      
      setMessage({ 
        type: "success", 
        text: "Profile updated successfully." 
      });
      
      // Refresh session
      await authClient.getSession({
        fetchOptions: {
          headers: {
            "Cache-Control": "no-cache"
          }
        }
      });
      router.refresh();
    } catch (error: any) {
      console.error("Failed to update profile", error);
      setMessage({ type: "error", text: error.message || "Failed to update profile. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8 w-full min-h-full">
      <div className={`mb-8 border-b pb-4 ${
        isLight ? "border-neutral-200" : "border-white/10"
      }`}>
        <h1 className={`text-3xl font-light tracking-tight mb-2 ${
          isLight ? "text-neutral-900" : "text-white"
        }`}>Settings</h1>
        <p className={`text-sm font-light ${
          isLight ? "text-neutral-500" : "text-neutral-400"
        }`}>Manage your account and preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Profile Section */}
        <section>
          <h2 className={`text-lg font-medium mb-4 uppercase tracking-widest text-xs border-b pb-2 ${
            isLight 
              ? "text-neutral-900 border-neutral-200" 
              : "text-white border-white/10"
          }`}>Profile Information</h2>
          
          {message && (
            <div className={`mb-4 p-3 text-sm border rounded-lg ${
              message.type === 'success' 
                ? isLight
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-green-500/10 text-green-400 border-green-500/20'
                : isLight
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}

          <div className={`rounded-xl p-6 ${
            isLight 
              ? "bg-white border border-neutral-200" 
              : "bg-[#1E1E1E] border border-white/10"
          }`}>
            <form onSubmit={handleUpdateProfile}>
              <div className="flex items-start gap-6 mb-6">
                {/* Profile Avatar */}
                <div className="flex-shrink-0">
                  <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-light shadow-lg ${
                    isLight
                      ? "bg-gradient-to-br from-neutral-500 to-neutral-700 text-white border border-neutral-400"
                      : "bg-gradient-to-br from-neutral-200 to-neutral-400 text-neutral-800 border border-white/10"
                  }`}>
                    {session?.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={session.user.image} 
                        alt={session.user.name || "User"} 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      session?.user?.name?.[0]?.toUpperCase() || <User size={28} />
                    )}
                  </div>
                </div>

                {/* Fields */}
                <div className="flex-1 w-full space-y-4">
                  <div className="group">
                    <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wide ${
                      isLight ? "text-neutral-600" : "text-neutral-400"
                    }`}>Full Name</label>
                    <div className={`flex items-center gap-3 px-3 py-2 border text-sm font-light transition-colors rounded-lg ${
                      isLight
                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus-within:border-neutral-400"
                        : "bg-[#252525] border-white/10 text-white focus-within:border-white/30"
                    }`}>
                      <User size={14} className={isLight ? "text-neutral-500" : "text-neutral-500"} />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-transparent border-none outline-none flex-1 placeholder:text-neutral-600"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wide ${
                      isLight ? "text-neutral-600" : "text-neutral-400"
                    }`}>Email Address</label>
                    <div className={`flex items-center gap-3 px-3 py-2 border text-sm font-light transition-colors rounded-lg ${
                      isLight
                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus-within:border-neutral-400"
                        : "bg-[#252525] border-white/10 text-white focus-within:border-white/30"
                    }`}>
                      <Mail size={14} className={isLight ? "text-neutral-500" : "text-neutral-500"} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-transparent border-none outline-none flex-1 placeholder:text-neutral-600"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isLoading || (name === session?.user?.name && email === session?.user?.email)}
                      className={`flex items-center gap-2 px-5 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider rounded-lg ${
                        isLight
                          ? "bg-neutral-900 text-white hover:bg-neutral-800"
                          : "bg-white text-neutral-900 hover:bg-neutral-200"
                      }`}
                    >
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </form>
            
            {/* Logout Button */}
            <div className={`pt-4 border-t ${
              isLight ? "border-neutral-200" : "border-white/10"
            }`}>
              <button
                onClick={handleSignOut}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border transition-colors uppercase tracking-wider rounded-lg ${
                  isLight
                    ? "text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300"
                    : "text-red-400 hover:bg-red-500/10 border-red-500/20 hover:border-red-500/30"
                }`}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* Usage Section */}
        <section>
          <h2 className={`text-lg font-medium mb-4 uppercase tracking-widest text-xs border-b pb-2 ${
            isLight 
              ? "text-neutral-900 border-neutral-200" 
              : "text-white border-white/10"
          }`}>Usage</h2>

          <div className={`rounded-xl p-6 ${
            isLight 
              ? "bg-white border border-neutral-200" 
              : "bg-[#1E1E1E] border border-white/10"
          }`}>
            {usageLoading ? (
              <p className={`text-sm font-light ${
                isLight ? "text-neutral-500" : "text-neutral-400"
              }`}>Loading token usage...</p>
            ) : usageError ? (
              <p className={`text-sm font-light ${
                isLight ? "text-red-600" : "text-red-400"
              }`}>{usageError}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "This Month", data: usageStats?.month },
                  { label: "All Time", data: usageStats?.allTime },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-lg p-4 border ${
                      isLight
                        ? "border-neutral-200 bg-neutral-50"
                        : "border-white/10 bg-[#252525]"
                    }`}
                  >
                    <p className={`text-xs uppercase tracking-wider ${
                      isLight ? "text-neutral-500" : "text-neutral-400"
                    }`}>{item.label}</p>
                    <p className={`text-2xl font-medium mt-2 ${
                      isLight ? "text-neutral-900" : "text-white"
                    }`}>
                      {(item.data?.totalTokens ?? 0).toLocaleString()}
                      <span className={`text-xs font-light ml-2 ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>tokens</span>
                    </p>
                    <div className={`mt-3 text-xs font-light ${
                      isLight ? "text-neutral-500" : "text-neutral-400"
                    }`}>
                      Live: {(item.data?.liveTokens ?? 0).toLocaleString()}
                      {" "}•{" "}
                      Screenshot: {(item.data?.screenshotTokens ?? 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <h2 className={`text-lg font-medium mb-4 uppercase tracking-widest text-xs border-b pb-2 ${
            isLight 
              ? "text-neutral-900 border-neutral-200" 
              : "text-white border-white/10"
          }`}>Notifications</h2>
          
          <div className={`rounded-xl p-6 ${
            isLight 
              ? "bg-white border border-neutral-200" 
              : "bg-[#1E1E1E] border border-white/10"
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {notificationsEnabled ? (
                    <Bell size={18} className={isLight ? "text-neutral-900" : "text-white"} />
                  ) : (
                    <BellOff size={18} className={isLight ? "text-neutral-500" : "text-neutral-500"} />
                  )}
                  <h3 className={`text-sm font-medium ${
                    isLight ? "text-neutral-900" : "text-white"
                  }`}>Test Completion Notifications</h3>
                </div>
                <p className={`text-xs font-light ml-7 mb-2 ${
                  isLight ? "text-neutral-500" : "text-neutral-400"
                }`}>
                  Get notified when your test runs complete. You'll receive a browser notification when the newest test finishes.
                </p>
                {notificationPermission === "denied" && (
                  <p className={`text-xs ml-7 ${
                    isLight ? "text-red-600" : "text-red-400"
                  }`}>
                    Notifications are blocked. Please enable them in your browser settings.
                  </p>
                )}
              </div>
              
              <div className="flex items-center flex-shrink-0">
                <button
                  onClick={handleToggleNotifications}
                  disabled={isRequestingPermission || notificationPermission === "denied"}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notificationsEnabled 
                      ? isLight
                        ? "bg-neutral-900 focus:ring-neutral-900 focus:ring-offset-white"
                        : "bg-white focus:ring-white focus:ring-offset-[#1E1E1E]"
                      : isLight
                        ? "bg-neutral-300 focus:ring-neutral-300 focus:ring-offset-white"
                        : "bg-neutral-600 focus:ring-neutral-600 focus:ring-offset-[#1E1E1E]"
                  } ${isRequestingPermission ? "opacity-50 cursor-wait" : ""} ${
                    notificationPermission === "denied" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                      notificationsEnabled 
                        ? isLight
                          ? "translate-x-6 bg-white"
                          : "translate-x-6 bg-[#1E1E1E]"
                        : isLight
                          ? "translate-x-1 bg-white"
                          : "translate-x-1 bg-[#1E1E1E]"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
