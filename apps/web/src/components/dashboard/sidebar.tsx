"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  LogOut, 
  Settings,
  Home,
  Orbit,
  FolderKanban
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { useTheme } from "@/contexts/theme-context";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function DashboardSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { theme } = useTheme();

  // Sidebar is expanded based on state
  const expanded = isExpanded;
  
  const isLight = theme === "light";

  const navItems = [
    {
      name: "Playground",
      href: "/dashboard",
      icon: Home
    },
    {
      name: "Swarms",
      href: "/dashboard/swarms",
      icon: Orbit,
      disabled: false
    },
    {
      name: "Projects",
      href: "/dashboard/projects",
      icon: FolderKanban,
      disabled: false
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };


  return (
    <motion.aside
      initial={{ width: 80 }}
      animate={{ width: expanded ? 260 : 80 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      onMouseLeave={() => {
        setProfileOpen(false);
      }}
      className={`h-[calc(100vh-2rem)] m-4 flex flex-col sticky top-4 z-20 overflow-hidden rounded-3xl shadow-xl ${
        isLight 
          ? "bg-white border border-neutral-200" 
          : "bg-[#1E1E1E] border border-white/10"
      }`}
    >
      {/* Header / Logo */}
      <div className={`h-28 flex items-center justify-center border-b w-full ${
        isLight ? "border-neutral-200" : "border-white/10"
      }`}>
        <AnimatePresence mode="wait">
          <motion.button
            key={expanded ? "expanded" : "collapsed"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex justify-center items-center w-full cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Image
                src={
                  expanded 
                    ? (isLight ? "/images/swarm_regular_2 (1).png" : "/images/swarm_regular_2_white.png")
                    : (isLight ? "/images/swarm_logo_black.png" : "/images/swarm_logo_white.png")
                }
                alt="Swarm"
                width={expanded ? 180 : 56}
                height={expanded ? 54 : 56}
                className={`object-contain ${
                  expanded ? "max-w-[80%] h-auto" : "w-14 h-14"
                }`}
              />
          </motion.button>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center ${expanded ? "gap-3 px-3" : "justify-center px-0"} py-3 rounded-xl transition-all group relative ${
                isActive 
                  ? isLight
                    ? "bg-neutral-100 text-neutral-900 shadow-sm ring-1 ring-neutral-200"
                    : "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : item.disabled 
                    ? isLight
                      ? "text-neutral-400 cursor-not-allowed"
                      : "text-neutral-600 cursor-not-allowed"
                    : isLight
                      ? "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <Icon
                size={22}
                strokeWidth={1.5}
                className={`flex-shrink-0 ${item.disabled ? "opacity-30" : "opacity-100"}`}
              />
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                  className="text-sm font-normal whitespace-nowrap overflow-hidden"
                >
                  {item.name}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggler */}
      <div className="px-3 py-2">
        <div className={`flex items-center ${expanded ? "justify-start gap-3 px-3" : "justify-center px-0"}`}>
          <AnimatedThemeToggler
            className={`flex items-center justify-center p-2 rounded-xl transition-colors ${
              isLight
                ? "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                : "text-neutral-400 hover:bg-white/5 hover:text-white"
            }`}
          />
          {expanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
              className={`text-sm font-normal ${
                isLight ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              Theme
            </motion.span>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className={`p-3 border-t relative ${
        isLight ? "border-neutral-200" : "border-white/10"
      }`}>
        {expanded ? (
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`w-full flex items-center gap-3 p-2 transition-colors rounded-xl ${
              profileOpen 
                ? isLight
                  ? "bg-neutral-100 border border-neutral-200"
                  : "bg-white/10 border border-white/10"
                : isLight
                  ? "hover:bg-neutral-50"
                  : "hover:bg-white/10"
            }`}
          >
            <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 font-medium text-sm rounded-lg shadow-sm ${
              isLight
                ? "bg-gradient-to-br from-neutral-500 to-neutral-700 text-white border border-neutral-400"
                : "bg-gradient-to-br from-neutral-200 to-neutral-400 text-neutral-800 border border-white/20"
            }`}>
              {session?.user?.name?.[0]?.toUpperCase() || <User size={18} strokeWidth={2} />}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="flex-1 text-left overflow-hidden whitespace-nowrap"
            >
              <div className={`text-sm font-normal truncate ${
                isLight ? "text-neutral-900" : "text-white"
              }`}>
                {session?.user?.name || "User"}
              </div>
              <div className={`text-xs truncate ${
                isLight ? "text-neutral-500" : "text-neutral-400"
              }`}>
                {session?.user?.email}
              </div>
            </motion.div>
          </button>
        ) : (
          <Link
            href="/dashboard/settings"
            className={`w-full flex items-center justify-center p-2 transition-colors rounded-xl ${
              isLight ? "hover:bg-neutral-50" : "hover:bg-white/10"
            }`}
          >
            <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 font-medium text-sm rounded-lg shadow-sm ${
              isLight
                ? "bg-gradient-to-br from-neutral-500 to-neutral-700 text-white border border-neutral-400"
                : "bg-gradient-to-br from-neutral-200 to-neutral-400 text-neutral-800 border border-white/20"
            }`}>
              {session?.user?.name?.[0]?.toUpperCase() || <User size={18} strokeWidth={2} />}
            </div>
          </Link>
        )}

        {/* Profile Popup Menu */}
        <AnimatePresence>
          {profileOpen && expanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`absolute bottom-full left-3 right-3 mb-2 rounded-xl shadow-xl overflow-hidden z-50 ${
                isLight
                  ? "bg-white border border-neutral-200 ring-1 ring-neutral-100"
                  : "bg-neutral-900 border border-white/10 ring-1 ring-white/5"
              }`}
            >
              <div className="p-1">
                <Link 
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                    isLight
                      ? "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                      : "text-neutral-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Settings size={16} strokeWidth={1.5} />
                  Settings
                </Link>
                <div className={`h-px my-1 ${
                  isLight ? "bg-neutral-200" : "bg-white/10"
                }`} />
                <button 
                  onClick={handleSignOut}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                    isLight
                      ? "text-red-600 hover:bg-red-50"
                      : "text-red-400 hover:bg-red-900/20"
                  }`}
                >
                  <LogOut size={16} strokeWidth={1.5} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
