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

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Notification state
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

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
    <div className="max-w-4xl mx-auto p-8 w-full h-full overflow-hidden flex flex-col">
      <div className="mb-12 border-b border-border pb-6 flex-shrink-0">
        <h1 className="text-3xl font-light tracking-tight text-foreground mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground font-light">Manage your account and preferences.</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <section>
          <h2 className="text-lg font-medium text-foreground mb-6 uppercase tracking-widest text-xs border-b border-border pb-2">Profile Information</h2>
          
          {message && (
            <div className={`mb-6 p-4 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'} border`}>
              {message.text}
            </div>
          )}

          <div className="bg-background border border-border rounded-none p-8">
            <form onSubmit={handleUpdateProfile}>
              <div className="flex flex-col md:flex-row items-start gap-8">
                {/* Profile Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gradient-to-br from-neutral-700 via-neutral-900 to-black rounded-none flex items-center justify-center text-primary-foreground text-4xl font-light shadow-lg border border-primary">
                    {session?.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={session.user.image} 
                        alt={session.user.name || "User"} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      session?.user?.name?.[0]?.toUpperCase() || <User size={32} />
                    )}
                  </div>
                </div>

                {/* Fields */}
                <div className="flex-1 w-full space-y-6 max-w-lg">
                  <div className="group">
                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Full Name</label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-background border border-border text-foreground text-sm font-light transition-colors focus-within:border-primary">
                      <User size={16} className="text-muted-foreground" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-transparent border-none outline-none flex-1 placeholder:text-muted-foreground/50"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Email Address</label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-background border border-border text-foreground text-sm font-light transition-colors focus-within:border-primary">
                      <Mail size={16} className="text-muted-foreground" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-transparent border-none outline-none flex-1 placeholder:text-muted-foreground/50"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={isLoading || (name === session?.user?.name && email === session?.user?.email)}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </form>
            
            {/* Logout Button */}
            <div className="mt-8 pt-8 border-t border-border">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 hover:border-destructive/30 transition-colors uppercase tracking-wider"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="mt-12">
          <h2 className="text-lg font-medium text-foreground mb-6 uppercase tracking-widest text-xs border-b border-border pb-2">Notifications</h2>
          
          <div className="bg-background border border-border rounded-none p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {notificationsEnabled ? (
                    <Bell size={20} className="text-primary" />
                  ) : (
                    <BellOff size={20} className="text-muted-foreground" />
                  )}
                  <h3 className="text-base font-medium text-foreground">Test Completion Notifications</h3>
                </div>
                <p className="text-sm text-muted-foreground font-light ml-8">
                  Get notified when your test runs complete. You'll receive a browser notification when the newest test finishes.
                </p>
                {notificationPermission === "denied" && (
                  <p className="text-xs text-destructive mt-2 ml-8">
                    Notifications are blocked. Please enable them in your browser settings.
                  </p>
                )}
              </div>
              
              <div className="flex items-center">
                <button
                  onClick={handleToggleNotifications}
                  disabled={isRequestingPermission || notificationPermission === "denied"}
                  className={`relative inline-flex h-6 w-11 items-center rounded-none transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 ${
                    notificationsEnabled ? "bg-neutral-900" : "bg-neutral-200"
                  } ${isRequestingPermission ? "opacity-50 cursor-wait" : ""} ${
                    notificationPermission === "denied" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform bg-white transition-transform border border-neutral-900 ${
                      notificationsEnabled ? "translate-x-6" : "translate-x-1"
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