"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getSwarms, deleteSwarm, updateSwarm, type Swarm } from "@/lib/batch-api";
import { 
  Plus, 
  Loader2, 
  Trash2, 
  Users, 
  User,
  X,
  Briefcase,
  Globe,
  Target,
  AlertCircle,
  MoreHorizontal,
  Edit2,
  Save
} from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

export default function SwarmsPage() {
  const { data: session, isPending } = useSession();
  const { theme } = useTheme();
  
  // Swarms Data
  const [swarms, setSwarms] = useState<Swarm[]>([]);
  const [isLoadingSwarms, setIsLoadingSwarms] = useState(true);
  const [swarmToDelete, setSwarmToDelete] = useState<string | null>(null);
  const [selectedSwarm, setSelectedSwarm] = useState<Swarm | null>(null);
  
  const isLight = theme === "light";

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [personasToDelete, setPersonasToDelete] = useState<number[]>([]); // Indices of personas to delete
  const [isSaving, setIsSaving] = useState(false);

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

  // Reset edit state when selected swarm changes
  useEffect(() => {
    if (selectedSwarm) {
      setEditName(selectedSwarm.name);
      setEditDescription(selectedSwarm.description || "");
      setPersonasToDelete([]);
      setIsEditing(false);
    }
  }, [selectedSwarm]);

  if (isPending) {
    return (
      <div className={`h-full flex items-center justify-center ${
        isLight ? "bg-neutral-50" : "bg-neutral-950"
      } ${isLight ? "text-neutral-900" : "text-white"}`}>
        <Loader2 className={`animate-spin w-8 h-8 ${
          isLight ? "text-neutral-500" : "text-neutral-400"
        }`} />
      </div>
    );
  }

  const handleDeleteSwarm = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSwarmToDelete(id);
  };

  const confirmDelete = async () => {
    if (!swarmToDelete) return;

    try {
      await deleteSwarm(swarmToDelete);
      setSwarms(swarms.filter(s => s.id !== swarmToDelete));
      setSwarmToDelete(null);
      if (selectedSwarm?.id === swarmToDelete) {
        setSelectedSwarm(null);
      }
    } catch (err) {
      alert("Failed to delete swarm");
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedSwarm) return;
    setIsSaving(true);
    try {
      // Filter out deleted personas
      const currentPersonas = selectedSwarm.personas;
      const updatedPersonas = currentPersonas.filter((_, idx) => !personasToDelete.includes(idx));

      const { swarm } = await updateSwarm(selectedSwarm.id, {
        name: editName,
        description: editDescription,
        personas: updatedPersonas,
        agentCount: updatedPersonas.length
      });

      // Update local state
      setSwarms(swarms.map(s => s.id === swarm.id ? swarm : s));
      setSelectedSwarm(swarm);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update swarm:", err);
      alert("Failed to update swarm");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePersonaDeletion = (index: number) => {
    if (personasToDelete.includes(index)) {
      setPersonasToDelete(personasToDelete.filter(i => i !== index));
    } else {
      setPersonasToDelete([...personasToDelete, index]);
    }
  };

  // List View
  return (
    <div className={`p-8 max-w-7xl mx-auto w-full min-h-screen ${
      isLight ? "bg-neutral-50" : "bg-neutral-950"
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-3xl font-light tracking-tight mb-2 ${
            isLight ? "text-neutral-900" : "text-white"
          }`}>Swarms</h1>
          <p className={`font-light ${
            isLight ? "text-neutral-500" : "text-neutral-400"
          }`}>Manage your persona groups and audiences.</p>
        </div>
        <Link
          href="/dashboard/swarms/new"
          className={`group flex items-center justify-center gap-2 border px-5 py-2.5 transition-all text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-300 rounded-lg ${
            isLight
              ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
              : "bg-[#252525] text-white border-white/10 hover:bg-[#333]"
          }`}
        >
          <Plus size={16} />
          <span>Create Swarm</span>
        </Link>
      </div>

      <div className={`border p-1 min-h-[400px] rounded-xl shadow-sm ${
        isLight
          ? "border-neutral-200 bg-white"
          : "border-white/10 bg-[#1E1E1E]"
      }`}>
        <div className={`h-full w-full rounded-lg ${
          isLight ? "bg-white" : "bg-[#1E1E1E]"
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {isLoadingSwarms ? (
              <div className="col-span-full flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className={`animate-spin w-8 h-8 ${
                  isLight ? "text-neutral-500" : "text-neutral-400"
                }`} />
                <span className={`text-sm font-light ${
                  isLight ? "text-neutral-600" : "text-neutral-500"
                }`}>Loading swarms...</span>
              </div>
            ) : swarms.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
                <h3 className={`text-lg font-medium ${
                  isLight ? "text-neutral-900" : "text-white"
                }`}>No swarms yet</h3>
                <p className={`font-light text-sm max-w-sm ${
                  isLight ? "text-neutral-500" : "text-neutral-400"
                }`}>
                  Create a reusable group of personas to efficiently test your applications.
                </p>
                <Link
                  href="/dashboard/swarms/new"
                  className={`inline-flex items-center justify-center gap-2 border px-5 py-2.5 transition-all text-sm font-medium rounded-lg mt-2 ${
                    isLight
                      ? "bg-neutral-100 text-neutral-900 border-neutral-300 hover:bg-neutral-200"
                      : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  Create Swarm
                </Link>
              </div>
            ) : (
              swarms.map((swarm) => (
                <div 
                  key={swarm.id} 
                  onClick={() => setSelectedSwarm(swarm)}
                  className={`group cursor-pointer p-6 border transition-all duration-200 relative rounded-xl h-full flex flex-col shadow-sm hover:shadow-md ${
                    isLight
                      ? "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 bg-white"
                      : "border-white/5 hover:border-white/20 hover:bg-white/5 bg-[#252525]"
                  }`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={`font-medium text-lg mb-1 ${
                        isLight ? "text-neutral-900" : "text-white"
                      }`}>{swarm.name}</h3>
                      <div className={`text-xs font-light flex items-center gap-2 ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>
                        <span>{new Date(swarm.createdAt).toLocaleDateString()}</span>
                        <span className={`w-1 h-1 rounded-full ${
                          isLight ? "bg-neutral-400" : "bg-neutral-600"
                        }`}></span>
                        <span>{swarm.personas.length} Personas</span>
                      </div>
                    </div>
                  </div>

                  {/* Tag-like text */}
                  <p className={`text-xs font-mono uppercase tracking-wider mb-2 ${
                    isLight ? "text-neutral-400" : "text-neutral-500"
                  }`}>
                     SWARM GROUP
                  </p>

                  {/* Description */}
                  <p className={`text-sm font-light leading-relaxed mb-4 line-clamp-3 flex-1 ${
                    isLight ? "text-neutral-600" : "text-neutral-400"
                  }`}>
                    {swarm.description || "No description provided."}
                  </p>

                  {/* Footer */}
                  <div className={`flex items-center justify-between mt-auto pt-4 border-t ${
                    isLight ? "border-neutral-200" : "border-white/5"
                  }`}>
                    <div className={`text-xs ${
                      isLight ? "text-neutral-500" : "text-neutral-500"
                    }`}>
                      Avg. Relevance: {Math.round(swarm.personas.reduce((acc, p) => acc + p.relevanceScore, 0) / (swarm.personas.length || 1) * 10) / 10}/10
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {swarmToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className={`border p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-xl ${
            isLight
              ? "bg-white border-neutral-200"
              : "bg-[#1E1E1E] border-white/10"
          }`}>
            <h3 className={`text-lg font-medium mb-2 ${
              isLight ? "text-neutral-900" : "text-white"
            }`}>Delete Swarm</h3>
            <p className={`font-light text-sm mb-6 ${
              isLight ? "text-neutral-600" : "text-neutral-400"
            }`}>
              Are you sure you want to delete this swarm? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSwarmToDelete(null)}
                className={`px-4 py-2 text-sm transition-colors rounded-lg ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className={`px-4 py-2 text-sm border transition-colors shadow-sm rounded-lg ${
                  isLight
                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swarm Details Modal */}
      {selectedSwarm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !isEditing && setSelectedSwarm(null)}>
          <div 
            className={`border w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-xl flex flex-col ${
              isLight
                ? "bg-white border-neutral-200"
                : "bg-[#1E1E1E] border-white/10"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-6 border-b flex items-start justify-between shrink-0 ${
              isLight
                ? "border-neutral-200 bg-white"
                : "border-white/10 bg-[#1E1E1E]"
            }`}>
              <div className="flex-1 mr-8">
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`text-2xl font-light w-full bg-transparent border-b outline-none pb-1 ${
                        isLight
                          ? "text-neutral-900 border-neutral-300 focus:border-neutral-500 placeholder:text-neutral-400"
                          : "text-white border-white/10 focus:border-white placeholder:text-neutral-600"
                      }`}
                      placeholder="Swarm Name"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className={`text-sm font-light w-full bg-transparent border-b outline-none pb-1 ${
                        isLight
                          ? "text-neutral-700 border-neutral-300 focus:border-neutral-500 placeholder:text-neutral-400"
                          : "text-neutral-300 border-white/10 focus:border-white placeholder:text-neutral-600"
                      }`}
                      placeholder="Description"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className={`text-2xl font-light mb-1 ${
                      isLight ? "text-neutral-900" : "text-white"
                    }`}>{selectedSwarm.name}</h2>
                    <p className={`font-light text-sm ${
                      isLight ? "text-neutral-600" : "text-neutral-400"
                    }`}>{selectedSwarm.description}</p>
                    <div className={`flex items-center gap-4 mt-4 text-xs font-mono uppercase tracking-wider ${
                      isLight ? "text-neutral-500" : "text-neutral-500"
                    }`}>
                      <span>Created: {new Date(selectedSwarm.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{selectedSwarm.personas.length} Personas</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                {!isEditing ? (
                  <>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className={`p-2.5 transition-colors rounded-lg ${
                        isLight
                          ? "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                      title="Edit Swarm"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSwarm(selectedSwarm.id)}
                      className={`p-2.5 transition-colors rounded-lg ${
                        isLight
                          ? "text-neutral-600 hover:text-red-600 hover:bg-red-50"
                          : "text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                      }`}
                      title="Delete Swarm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 transition-colors rounded-lg text-sm font-medium ${
                      isLight
                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                        : "bg-white text-neutral-900 hover:bg-neutral-200"
                    }`}
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save</span>
                  </button>
                )}
                
                <div className={`w-px h-6 mx-1 ${
                  isLight ? "bg-neutral-200" : "bg-white/10"
                }`} />
                
                <button 
                  onClick={() => {
                    if (isEditing) {
                      setIsEditing(false);
                      // Reset values
                      setEditName(selectedSwarm.name);
                      setEditDescription(selectedSwarm.description || "");
                      setPersonasToDelete([]);
                    } else {
                      setSelectedSwarm(null);
                    }
                  }}
                  className={`p-2.5 transition-colors rounded-lg ${
                    isLight
                      ? "hover:bg-neutral-100"
                      : "hover:bg-white/5"
                  }`}
                  title="Close"
                >
                  <X size={20} className={isLight ? "text-neutral-600 hover:text-neutral-900" : "text-neutral-400 hover:text-white"} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className={`overflow-y-auto p-6 ${
              isLight ? "bg-neutral-50" : "bg-[#181818]"
            }`}>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedSwarm.personas.map((persona, idx) => {
                  const isMarkedForDeletion = personasToDelete.includes(idx);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`
                        border p-5 rounded-xl transition-all relative
                        ${isMarkedForDeletion 
                          ? isLight
                            ? 'border-red-300 ring-1 ring-red-300 bg-red-50'
                            : 'border-red-500/30 ring-1 ring-red-500/30 bg-red-900/10'
                          : isLight
                            ? 'border-neutral-200 hover:border-neutral-300 bg-white'
                            : 'border-white/5 hover:border-white/10 bg-[#252525]'
                        }
                      `}
                    >
                      {/* Delete Icon Overlay (Only visible in editing mode) */}
                      {isEditing && (
                        <div className="absolute bottom-3 right-3 z-10">
                           <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePersonaDeletion(idx);
                            }}
                            className={`
                                p-2 rounded-full shadow-sm border transition-all
                                ${isMarkedForDeletion 
                                    ? isLight
                                    ? "bg-red-500 text-white border-red-600 hover:bg-red-600" 
                                      : "bg-red-500 text-white border-red-600 hover:bg-red-600"
                                    : isLight
                                      ? "bg-white text-neutral-400 border-neutral-300 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                                    : "bg-[#252525] text-neutral-400 border-white/10 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
                                }
                            `}
                            title={isMarkedForDeletion ? "Undo Delete" : "Delete Persona"}
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      )}

                      <div className={`flex items-start justify-between mb-4 ${isMarkedForDeletion ? 'opacity-50' : ''}`}>
                        <div>
                          <h4 className={`font-medium ${
                            isLight ? "text-neutral-900" : "text-white"
                          }`}>{persona.name}</h4>
                          <div className={`text-sm flex items-center gap-2 mt-1 ${
                            isLight ? "text-neutral-600" : "text-neutral-400"
                          }`}>
                            <span>{persona.age} years old</span>
                            <span>•</span>
                            <span className="capitalize">{persona.incomeLevel} Income</span>
                          </div>
                        </div>
                        <div className={`px-2 py-1 text-xs font-medium uppercase tracking-wide rounded-lg border ${
                          isLight
                            ? "bg-neutral-100 text-neutral-700 border-neutral-200"
                            : "bg-white/5 text-neutral-300 border-white/5"
                        }`}>
                          Score: {persona.relevanceScore}
                        </div>
                      </div>

                      <div className={`space-y-3 text-sm ${isMarkedForDeletion ? 'opacity-50' : ''}`}>
                        <div className="flex items-start gap-2">
                          <Briefcase size={14} className={`mt-0.5 ${
                            isLight ? "text-neutral-400" : "text-neutral-500"
                          }`} />
                          <span className={isLight ? "text-neutral-700" : "text-neutral-300"}>{persona.occupation}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Globe size={14} className={`mt-0.5 ${
                            isLight ? "text-neutral-400" : "text-neutral-500"
                          }`} />
                          <span className={isLight ? "text-neutral-700" : "text-neutral-300"}>{persona.country}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Target size={14} className={`mt-0.5 ${
                            isLight ? "text-neutral-400" : "text-neutral-500"
                          }`} />
                          <span className={isLight ? "text-neutral-700" : "text-neutral-300"}>{persona.primaryGoal}</span>
                        </div>
                      </div>

                      <div className={`mt-4 pt-4 border-t ${isMarkedForDeletion ? 'opacity-50' : ''} ${
                        isLight ? "border-neutral-200" : "border-white/5"
                      }`}>
                        <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide ${
                          isLight ? "text-neutral-500" : "text-neutral-500"
                        }`}>
                          <AlertCircle size={12} />
                          <span>Pain Points</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {persona.painPoints.slice(0, 3).map((point, i) => (
                            <span key={i} className={`px-2 py-1 text-xs rounded-lg border ${
                              isLight
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                              {point}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className={`p-4 border-t flex justify-end shrink-0 ${
              isLight
                ? "border-neutral-200 bg-white"
                : "border-white/10 bg-[#1E1E1E]"
            }`}>
               <button 
                onClick={() => {
                   if (isEditing) {
                     setIsEditing(false);
                     setEditName(selectedSwarm.name);
                     setEditDescription(selectedSwarm.description || "");
                     setPersonasToDelete([]);
                   } else {
                     setSelectedSwarm(null);
                   }
                }}
                className={`px-4 py-2 text-sm border transition-colors rounded-lg ${
                  isLight
                    ? "border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                    : "border-white/10 hover:bg-white/5 text-neutral-300 hover:text-white"
                }`}
              >
                {isEditing ? "Cancel" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
