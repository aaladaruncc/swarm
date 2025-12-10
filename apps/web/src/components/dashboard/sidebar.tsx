"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutGrid, 
  Terminal, 
  User, 
  LogOut, 
  Settings, 
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

export function DashboardSidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  // Sidebar is expanded if hovered
  const expanded = isHovered;

  const navItems = [
    {
      name: "Playground",
      href: "/dashboard",
      icon: Terminal
    },
    {
      name: "Swarms",
      href: "#", // Disabled/Non-functional as requested
      icon: LayoutGrid,
      disabled: true
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <motion.aside
      initial={{ width: 140 }}
      animate={{ width: expanded ? 300 : 140 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setProfileOpen(false);
      }}
      className="h-screen bg-neutral-50 border-r border-neutral-200 flex flex-col sticky top-0 z-20 overflow-hidden"
    >
      {/* Header / Logo */}
      <div className="h-28 flex items-center px-6 border-b border-neutral-200">
        <div className="flex items-center gap-3 overflow-hidden min-w-max">
          <AnimatePresence mode="wait">
            <motion.div
              key={expanded ? "expanded" : "collapsed"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex-shrink-0"
            >
              <Image
                src={expanded ? "/images/nomos-agent.png" : "/images/nomos_small.png"}
                alt="Nomos"
                width={expanded ? 300 : 80}
                height={expanded ? 90 : 80}
                className={`object-contain ${
                  expanded ? "w-auto h-20" : "w-20 h-20"
                }`}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative ${
                isActive 
                  ? "bg-white text-neutral-900 shadow-sm border border-neutral-100" 
                  : item.disabled 
                    ? "text-neutral-300 cursor-not-allowed" 
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <item.icon size={20} className={`flex-shrink-0 ${isActive ? "text-neutral-900" : item.disabled ? "text-neutral-300" : "text-neutral-600 group-hover:text-neutral-900"}`} />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: expanded ? 1 : 0 }}
                transition={{ duration: 0.1 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                {item.name}
              </motion.span>
            </Link>
          );
        })}
      </nav>

      {/* Profile Section */}
      <div className="p-3 border-t border-neutral-200 relative">
        <button
          onClick={() => expanded && setProfileOpen(!profileOpen)}
          className={`w-full flex items-center gap-3 p-2 transition-colors ${
            profileOpen ? "bg-white shadow-sm border border-neutral-100" : "hover:bg-neutral-100"
          }`}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-neutral-700 via-neutral-900 to-black flex items-center justify-center flex-shrink-0 text-white font-medium text-sm rounded-none shadow-sm border border-neutral-800">
            {session?.user?.name?.[0]?.toUpperCase() || <User size={16} />}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.1 }}
            className="flex-1 text-left overflow-hidden whitespace-nowrap"
          >
            <div className="text-sm font-medium text-neutral-900 truncate">
              {session?.user?.name || "User"}
            </div>
            <div className="text-xs text-neutral-500 truncate">
              {session?.user?.email}
            </div>
          </motion.div>
        </button>

        {/* Profile Popup Menu */}
        <AnimatePresence>
          {profileOpen && expanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden z-50"
            >
              <div className="p-1">
                <Link 
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 rounded-lg transition-colors text-left"
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <div className="h-px bg-neutral-100 my-1" />
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                >
                  <LogOut size={16} />
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
