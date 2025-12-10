"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getSwarms, deleteSwarm, type Swarm } from "@/lib/batch-api";
import { 
  Plus, 
  Loader2, 
  Trash2, 
  Users, 
  User
} from "lucide-react";

export default function SwarmsPage() {
  const { data: session, isPending } = useSession();
  
  // Swarms Data
  const [swarms, setSwarms] = useState<Swarm[]>([]);
  const [isLoadingSwarms, setIsLoadingSwarms] = useState(true);

  const loadSwarms = async () => {
    try {
      const data = await getSwarms();
      setSwarms(data.swarms);
    } catch (err) {
      console.error("Failed to load swarms:", err);
    } finally {
      setIsLoadingSwarms(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadSwarms();
    }
  }, [session]);

  if (isPending) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-neutral-900">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
      </div>
    );
  }

  const handleDeleteSwarm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this swarm?")) return;

    try {
      await deleteSwarm(id);
      setSwarms(swarms.filter(s => s.id !== id));
    } catch (err) {
      alert("Failed to delete swarm");
    }
  };

  // List View
  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-2">Swarms</h1>
          <p className="text-neutral-500 font-light">Manage your persona groups and audiences.</p>
        </div>
        <Link
          href="/swarms/new"
          className="group flex items-center justify-center gap-2 bg-neutral-900 text-white px-5 py-2.5 hover:bg-neutral-800 transition-all text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-300 rounded-none"
        >
          <Plus size={16} />
          <span>Create Swarm</span>
        </Link>
      </div>

      <div className="border border-dashed border-neutral-300 p-1 min-h-[400px] rounded-none">
        {isLoadingSwarms ? (
          <div className="flex justify-center items-center h-full min-h-[400px]">
            <Loader2 className="animate-spin w-8 h-8 text-neutral-300" />
          </div>
        ) : swarms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No swarms yet</h3>
            <p className="text-neutral-500 font-light text-sm max-w-sm mb-6">
              Create a reusable group of personas to efficiently test your applications.
            </p>
            <Link
              href="/swarms/new"
              className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white text-neutral-900 px-5 py-2.5 hover:border-neutral-900 transition-all text-sm font-medium rounded-none"
            >
              Create Swarm
            </Link>
          </div>
        ) : (
          <div className="bg-white h-full w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {swarms.map((swarm) => (
                <div key={swarm.id} className="border border-neutral-200 p-6 hover:border-neutral-400 transition-all group relative bg-white rounded-none">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-neutral-50 rounded-none">
                      <Users size={20} className="text-neutral-900" />
                    </div>
                    <button className="text-neutral-400 hover:text-red-600 transition-colors z-10 relative">
                      <Trash2 size={16} onClick={(e) => handleDeleteSwarm(swarm.id, e)}/>
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-medium text-neutral-900 mb-1">{swarm.name}</h3>
                  <p className="text-sm text-neutral-500 font-light mb-4 line-clamp-2 h-10">
                    {swarm.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-neutral-500 font-light border-t border-neutral-100 pt-4">
                    <div className="flex items-center gap-1.5">
                      <User size={14} />
                      <span>{swarm.personas.length} Personas</span>
                    </div>
                    <div>
                      {new Date(swarm.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Hover visual */}
                  <div className="absolute inset-0 border-2 border-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-none" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}