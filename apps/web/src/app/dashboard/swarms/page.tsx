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

export default function SwarmsPage() {
  const { data: session, isPending } = useSession();
  
  // Swarms Data
  const [swarms, setSwarms] = useState<Swarm[]>([]);
  const [isLoadingSwarms, setIsLoadingSwarms] = useState(true);
  const [swarmToDelete, setSwarmToDelete] = useState<string | null>(null);
  const [selectedSwarm, setSelectedSwarm] = useState<Swarm | null>(null);

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
      <div className="h-full flex items-center justify-center bg-white text-neutral-900">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
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
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-2">Swarms</h1>
          <p className="text-neutral-500 font-light">Manage your persona groups and audiences.</p>
        </div>
        <Link
          href="/dashboard/swarms/new"
          className="group flex items-center justify-center gap-2 bg-neutral-900 text-white px-5 py-2.5 hover:bg-neutral-800 transition-all text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-300 rounded-none"
        >
          <Plus size={16} />
          <span>Create Swarm</span>
        </Link>
      </div>

      <div className="border border-dashed border-neutral-300 p-1 min-h-[400px] rounded-none">
        <div className="bg-white h-full w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {isLoadingSwarms ? (
              <div className="col-span-full flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
                <span className="text-sm text-neutral-500 font-light">Loading swarms...</span>
              </div>
            ) : swarms.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
                <h3 className="text-lg font-medium text-neutral-900">No swarms yet</h3>
                <p className="text-neutral-500 font-light text-sm max-w-sm">
                  Create a reusable group of personas to efficiently test your applications.
                </p>
                <Link
                  href="/dashboard/swarms/new"
                  className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white text-neutral-900 px-5 py-2.5 hover:border-neutral-900 transition-all text-sm font-medium rounded-none mt-2"
                >
                  Create Swarm
                </Link>
              </div>
            ) : (
              swarms.map((swarm) => (
                <div 
                  key={swarm.id} 
                  onClick={() => setSelectedSwarm(swarm)}
                  className="group cursor-pointer p-6 border border-neutral-200 hover:border-neutral-400 hover:shadow-sm transition-all duration-200 relative bg-white rounded-none h-full flex flex-col"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium text-lg mb-1">{swarm.name}</h3>
                      <div className="text-xs text-neutral-500 font-light flex items-center gap-2">
                        <span>{new Date(swarm.createdAt).toLocaleDateString()}</span>
                        <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                        <span>{swarm.personas.length} Personas</span>
                      </div>
                    </div>
                    
                    {/* Action Menu (Three Dots) - Removed as per request */}
                    {/* <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
                       <button 
                         className="text-neutral-400 hover:text-neutral-900 transition-colors p-1"
                         onClick={(e) => handleDeleteSwarm(swarm.id, e)}
                         title="Delete Swarm"
                       >
                         <MoreHorizontal size={20} />
                       </button>
                    </div> */}
                  </div>

                  {/* Tag-like text */}
                  <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider mb-2">
                     SWARM GROUP
                  </p>

                  {/* Description */}
                  <p className="text-sm text-neutral-600 font-light leading-relaxed mb-4 line-clamp-3 flex-1">
                    {swarm.description || "No description provided."}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-100">
                    <div className="text-xs text-neutral-400">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-none">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Delete Swarm</h3>
            <p className="text-neutral-500 font-light text-sm mb-6">
              Are you sure you want to delete this swarm? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSwarmToDelete(null)}
                className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors rounded-none"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm rounded-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swarm Details Modal */}
      {selectedSwarm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !isEditing && setSelectedSwarm(null)}>
          <div 
            className="bg-white w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-none flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 flex items-start justify-between bg-white shrink-0">
              <div className="flex-1 mr-8">
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-2xl font-light text-neutral-900 w-full border-b border-neutral-300 focus:border-neutral-900 outline-none pb-1 placeholder:text-neutral-300"
                      placeholder="Swarm Name"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="text-sm font-light text-neutral-600 w-full border-b border-neutral-300 focus:border-neutral-900 outline-none pb-1 placeholder:text-neutral-300"
                      placeholder="Description"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-light text-neutral-900 mb-1">{selectedSwarm.name}</h2>
                    <p className="text-neutral-500 font-light text-sm">{selectedSwarm.description}</p>
                    <div className="flex items-center gap-4 mt-4 text-xs text-neutral-400 font-mono uppercase tracking-wider">
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
                      className="p-2.5 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors rounded-none"
                      title="Edit Swarm"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSwarm(selectedSwarm.id)}
                      className="p-2.5 hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors rounded-none"
                      title="Delete Swarm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors rounded-none text-sm font-medium"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save</span>
                  </button>
                )}
                
                <div className="w-px h-6 bg-neutral-200 mx-1" />
                
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
                  className="p-2.5 hover:bg-neutral-100 transition-colors rounded-none"
                  title="Close"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 bg-neutral-50/50">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedSwarm.personas.map((persona, idx) => {
                  const isMarkedForDeletion = personasToDelete.includes(idx);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`
                        bg-white border p-5 rounded-none transition-all relative
                        ${isMarkedForDeletion 
                          ? 'border-red-300 ring-1 ring-red-300 bg-red-50/30' 
                          : 'border-neutral-200'
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
                                    ? "bg-red-500 text-white border-red-600 hover:bg-red-600" 
                                    : "bg-white text-neutral-400 border-neutral-200 hover:text-red-500 hover:border-red-200"
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
                          <h4 className="font-medium text-neutral-900">{persona.name}</h4>
                          <div className="text-sm text-neutral-500 flex items-center gap-2 mt-1">
                            <span>{persona.age} years old</span>
                            <span>•</span>
                            <span className="capitalize">{persona.incomeLevel} Income</span>
                          </div>
                        </div>
                        <div className="px-2 py-1 bg-neutral-100 text-xs font-medium text-neutral-600 uppercase tracking-wide rounded-none">
                          Score: {persona.relevanceScore}
                        </div>
                      </div>

                      <div className={`space-y-3 text-sm ${isMarkedForDeletion ? 'opacity-50' : ''}`}>
                        <div className="flex items-start gap-2">
                          <Briefcase size={14} className="mt-0.5 text-neutral-400" />
                          <span className="text-neutral-700">{persona.occupation}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Globe size={14} className="mt-0.5 text-neutral-400" />
                          <span className="text-neutral-700">{persona.country}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Target size={14} className="mt-0.5 text-neutral-400" />
                          <span className="text-neutral-700">{persona.primaryGoal}</span>
                        </div>
                      </div>

                      <div className={`mt-4 pt-4 border-t border-neutral-100 ${isMarkedForDeletion ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                          <AlertCircle size={12} />
                          <span>Pain Points</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {persona.painPoints.slice(0, 3).map((point, i) => (
                            <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-none border border-red-100">
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
            <div className="p-4 border-t border-neutral-100 bg-white flex justify-end shrink-0">
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
                className="px-4 py-2 text-sm border border-neutral-200 hover:bg-neutral-50 text-neutral-900 transition-colors rounded-none"
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
