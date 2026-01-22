"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, GripVertical, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface ScreenshotFile {
    id: string;
    file: File;
    preview: string;
    description: string;
}

interface ScreenshotUploaderProps {
    screenshots: ScreenshotFile[];
    onScreenshotsChange: (screenshots: ScreenshotFile[]) => void;
    maxScreenshots?: number;
    showInstruction?: boolean;
    showAddMoreFiles?: boolean;
    fileInputRef?: React.RefObject<HTMLInputElement>;
    onFileInputClick?: () => void;
}

export function ScreenshotUploader({
    screenshots,
    onScreenshotsChange,
    maxScreenshots = 20,
    showInstruction = true,
    showAddMoreFiles = true,
    fileInputRef: externalFileInputRef,
    onFileInputClick,
}: ScreenshotUploaderProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const internalFileInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = externalFileInputRef || internalFileInputRef;
    const [dragOver, setDragOver] = useState(false);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
    const dragIndexRef = useRef<number | null>(null);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        const newScreenshots: ScreenshotFile[] = [];
        const remaining = maxScreenshots - screenshots.length;

        // Convert FileList to array, filter images, and sort chronologically
        const fileArray = Array.from(files)
            .filter(file => file.type.startsWith("image/"))
            .slice(0, remaining)
            .sort((a, b) => {
                // Sort by lastModified date (chronological - oldest first)
                // If lastModified is the same, fall back to name comparison
                if (a.lastModified !== b.lastModified) {
                    return a.lastModified - b.lastModified;
                }
                return a.name.localeCompare(b.name);
            });

        fileArray.forEach((file) => {
            const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const preview = URL.createObjectURL(file);
            newScreenshots.push({
                id,
                file,
                preview,
                description: "",
            });
        });

        onScreenshotsChange([...screenshots, ...newScreenshots]);
    }, [screenshots, maxScreenshots, onScreenshotsChange]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const removeScreenshot = (id: string) => {
        const screenshot = screenshots.find(s => s.id === id);
        if (screenshot) {
            URL.revokeObjectURL(screenshot.preview);
        }
        onScreenshotsChange(screenshots.filter(s => s.id !== id));
    };

    const moveScreenshot = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || toIndex < 0) return;
        if (fromIndex >= screenshots.length || toIndex >= screenshots.length) return;

        const newScreenshots = [...screenshots];
        const [moved] = newScreenshots.splice(fromIndex, 1);
        newScreenshots.splice(toIndex, 0, moved);
        onScreenshotsChange(newScreenshots);
    };

    const handleDragStart = (index: number) => (event: React.DragEvent) => {
        dragIndexRef.current = index;
        setDraggedIndex(index);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", screenshots[index]?.id || "");
        // Make the dragged element semi-transparent
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.style.opacity = "0.5";
        }
    };

    const handleDragOverItem = (index: number) => (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        
        if (dragIndexRef.current === null || dragIndexRef.current === index) {
            setDropTargetIndex(null);
            return;
        }

        setDropTargetIndex(index);
    };

    const handleDragLeaveItem = () => {
        // Only clear if we're not hovering over another item
        setDropTargetIndex(null);
    };

    const handleDropItem = (index: number) => (event: React.DragEvent) => {
        event.preventDefault();
        const fromIndex = dragIndexRef.current;
        
        if (fromIndex === null) return;
        
        moveScreenshot(fromIndex, index);
        
        // Reset drag state
        dragIndexRef.current = null;
        setDraggedIndex(null);
        setDropTargetIndex(null);
        
        // Reset opacity
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.style.opacity = "1";
        }
    };

    const handleDragEnd = (event: React.DragEvent) => {
        // Reset all drag state
        dragIndexRef.current = null;
        setDraggedIndex(null);
        setDropTargetIndex(null);
        
        // Reset opacity
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.style.opacity = "1";
        }
    };

    const updateDescription = (id: string, description: string) => {
        onScreenshotsChange(
            screenshots.map(s => s.id === id ? { ...s, description } : s)
        );
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Show table format when files are uploaded
    if (screenshots.length > 0) {
        return (
            <div className="space-y-4">
                {/* Header with file count - only show if showInstruction is true */}
                {showInstruction && (
                    <div className="flex items-center justify-between mb-4">
                        <p className={`text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                            Drag and drop the images to arrange them according to the user flow. This is important to illustrate the user journey.
                        </p>
                        <span className={`text-sm font-medium ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                            {screenshots.length} of {maxScreenshots} files
                        </span>
                    </div>
                )}

                {/* Table with uploaded files */}
                <div className={`border rounded-xl overflow-hidden ${isLight
                    ? "bg-white border-neutral-200"
                    : "bg-[#1E1E1E] border-white/10"
                    }`}>
                    {/* Table Header */}
                    <div className={`grid grid-cols-[40px_40px_1fr_100px_120px_40px] gap-4 px-6 py-3 border-b ${isLight
                        ? "bg-neutral-50 border-neutral-200"
                        : "bg-[#252525] border-white/10"
                        }`}>
                        <div></div> {/* Drag handle column */}
                        <div></div> {/* Sequence number column */}
                        <div className={`text-xs font-medium uppercase tracking-wider ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                            Name
                        </div>
                        <div className={`text-xs font-medium uppercase tracking-wider ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                            Size
                        </div>
                        <div className={`text-xs font-medium uppercase tracking-wider ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                            Status
                        </div>
                        <div></div> {/* Remove button column */}
                    </div>

                    {/* Table Body */}
                    <div className="divide-y">
                        {screenshots.map((screenshot, index) => {
                            const isDragged = draggedIndex === index;
                            const isDropTarget = dropTargetIndex === index;
                            const isDragging = draggedIndex !== null;
                            
                            return (
                                <div
                                    key={screenshot.id}
                                    draggable
                                    onDragStart={handleDragStart(index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={handleDragOverItem(index)}
                                    onDragLeave={handleDragLeaveItem}
                                    onDrop={handleDropItem(index)}
                                    className={`grid grid-cols-[40px_40px_1fr_100px_120px_40px] gap-4 px-6 items-center transition-all duration-200 cursor-grab active:cursor-grabbing ${
                                        isDragged
                                            ? "opacity-30 scale-95"
                                            : isDropTarget
                                                ? isLight
                                                    ? "bg-blue-50 border-l-4 border-blue-400 py-6 my-2 rounded"
                                                    : "bg-blue-500/10 border-l-4 border-blue-400 py-6 my-2 rounded"
                                                : isDragging
                                                    ? isLight
                                                        ? "bg-white py-4"
                                                        : "bg-[#1E1E1E] py-4"
                                                    : isLight
                                                        ? "bg-white hover:bg-neutral-50 py-4"
                                                        : "bg-[#1E1E1E] hover:bg-white/5 py-4"
                                    }`}
                                >
                                {/* Drag Handle Icon (visual indicator only) */}
                                <div className={`p-1.5 rounded ${isLight
                                    ? "text-neutral-400"
                                    : "text-neutral-500"
                                    }`}>
                                    <GripVertical size={16} />
                                </div>

                                {/* Sequence Number */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isLight
                                    ? "bg-neutral-100 text-neutral-700"
                                    : "bg-[#252525] text-neutral-300"
                                    }`}>
                                    {index + 1}
                                </div>

                                {/* Thumbnail + Name */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-16 h-12 rounded overflow-hidden flex-shrink-0 ${isLight ? "bg-neutral-100" : "bg-[#252525]"
                                        }`}>
                                        <img
                                            src={screenshot.preview}
                                            alt={`Screenshot ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-medium truncate ${isLight ? "text-neutral-900" : "text-white"}`}>
                                            {screenshot.file.name}
                                        </p>
                                    </div>
                                </div>

                                {/* File Size */}
                                <div className={`text-sm ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                    {formatFileSize(screenshot.file.size)}
                                </div>

                                {/* Status Badge */}
                                <div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isLight
                                        ? "bg-green-50 text-green-700"
                                        : "bg-green-500/10 text-green-400"
                                        }`}>
                                        <CheckCircle2 size={12} />
                                        Success
                                    </span>
                                </div>

                                {/* Remove Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeScreenshot(screenshot.id);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className={`p-1.5 rounded-lg transition-colors ${isLight
                                        ? "hover:bg-red-50 text-neutral-400 hover:text-red-500"
                                        : "hover:bg-red-500/10 text-neutral-500 hover:text-red-400"
                                        }`}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            );
                        })}
                    </div>
                </div>

                {/* Add More Files Area - only show if showAddMoreFiles is true */}
                {showAddMoreFiles && screenshots.length < maxScreenshots && (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                            ${dragOver
                                ? isLight
                                    ? "border-neutral-900 bg-neutral-100"
                                    : "border-white bg-white/10"
                                : isLight
                                    ? "border-neutral-300 hover:border-neutral-400 bg-neutral-50 hover:bg-neutral-100"
                                    : "border-white/10 hover:border-white/20 bg-[#252525] hover:bg-white/5"
                            }
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleFiles(e.target.files)}
                            className="hidden"
                        />
                        <Upload className={`w-6 h-6 mx-auto mb-2 ${isLight ? "text-neutral-400" : "text-neutral-500"}`} />
                        <p className={`text-sm font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                            Drop more files or click to upload
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // Initial drop zone when no files uploaded
    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${dragOver
                    ? isLight
                        ? "border-neutral-900 bg-neutral-100"
                        : "border-white bg-white/10"
                    : isLight
                        ? "border-neutral-300 hover:border-neutral-400 bg-neutral-50 hover:bg-neutral-100"
                        : "border-white/10 hover:border-white/20 bg-[#252525] hover:bg-white/5"
                }
            `}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
            />
            <Upload className={`w-8 h-8 mx-auto mb-3 ${isLight ? "text-neutral-400" : "text-neutral-500"}`} />
            <p className={`text-sm font-medium mb-1 ${isLight ? "text-neutral-900" : "text-white"}`}>
                Drop screenshots here or click to upload
            </p>
            <p className={`text-xs font-light ${isLight ? "text-neutral-500" : "text-neutral-500"}`}>
                PNG, JPG, or WebP • Max {maxScreenshots} screenshots
            </p>
        </div>
    );
}

export type { ScreenshotFile };
