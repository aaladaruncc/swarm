"use client";

import { useSession } from "@/lib/auth-client";
import { User, Mail, Shield, Key } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-4xl mx-auto p-8 w-full">
      <div className="mb-12 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-2">Settings</h1>
        <p className="text-sm text-neutral-500 font-light">Manage your account and preferences.</p>
      </div>

      <div className="space-y-12">
        {/* Profile Section */}
        <section>
          <h2 className="text-lg font-medium text-neutral-900 mb-6 uppercase tracking-widest text-xs border-b border-neutral-100 pb-2">Profile Information</h2>
          <div className="bg-white border border-neutral-200 rounded-none p-8">
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Profile Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-neutral-700 via-neutral-900 to-black rounded-none flex items-center justify-center text-white text-4xl font-light shadow-lg border border-neutral-800">
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
                  <label className="block text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">Full Name</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-white border border-neutral-200 text-neutral-900 text-sm font-light transition-colors group-hover:border-neutral-400">
                    <User size={16} className="text-neutral-400" />
                    {session?.user?.name || "Loading..."}
                  </div>
                </div>
                <div className="group">
                  <label className="block text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">Email Address</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-white border border-neutral-200 text-neutral-900 text-sm font-light transition-colors group-hover:border-neutral-400">
                    <Mail size={16} className="text-neutral-400" />
                    {session?.user?.email || "Loading..."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section (Placeholder) */}
        <section className="opacity-70">
          <div className="flex items-center justify-between mb-6 border-b border-neutral-100 pb-2">
            <h2 className="text-lg font-medium text-neutral-900 uppercase tracking-widest text-xs">Security Settings</h2>
            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-500 px-2 py-1 uppercase tracking-wider">Coming Soon</span>
          </div>
          
          <div className="bg-white border border-neutral-200 rounded-none divide-y divide-neutral-100">
            <div className="p-6 flex items-center justify-between group hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-50 border border-neutral-100 text-neutral-900">
                        <Key size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-neutral-900">Password</p>
                        <p className="text-xs text-neutral-500 font-light mt-0.5">Change your account password</p>
                    </div>
                </div>
                <button disabled className="px-4 py-2 text-xs font-medium border border-neutral-200 text-neutral-400 cursor-not-allowed uppercase tracking-wider hover:border-neutral-300 transition-colors">Update</button>
            </div>
            
            <div className="p-6 flex items-center justify-between group hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-50 border border-neutral-100 text-neutral-900">
                        <Shield size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-neutral-900">Two-Factor Authentication</p>
                        <p className="text-xs text-neutral-500 font-light mt-0.5">Add an extra layer of security</p>
                    </div>
                </div>
                <button disabled className="px-4 py-2 text-xs font-medium border border-neutral-200 text-neutral-400 cursor-not-allowed uppercase tracking-wider hover:border-neutral-300 transition-colors">Enable</button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

