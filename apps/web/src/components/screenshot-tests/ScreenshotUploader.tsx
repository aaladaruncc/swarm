"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, GripVertical } from "lucide-react";
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
}

export function ScreenshotUploader({
    screenshots,
    onScreenshotsChange,
    maxScreenshots = 20,
}: ScreenshotUploaderProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragIndexRef = useRef<number | null>(null);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        const newScreenshots: ScreenshotFile[] = [];
        const remaining = maxScreenshots - screenshots.length;

        Array.from(files).slice(0, remaining).forEach((file) => {
            if (file.type.startsWith("image/")) {
                const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const preview = URL.createObjectURL(file);
                newScreenshots.push({
                    id,
                    file,
                    preview,
                    description: "",
                });
            }
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
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", screenshots[index]?.id || "");
    };

    const handleDragOverItem = (id: string) => (event: React.DragEvent) => {
        event.preventDefault();
        setDragOverId(id);
        event.dataTransfer.dropEffect = "move";
    };

    const handleDropItem = (index: number) => (event: React.DragEvent) => {
        event.preventDefault();
        const fromIndex = dragIndexRef.current;
        dragIndexRef.current = null;
        setDragOverId(null);

        if (fromIndex === null) return;
        moveScreenshot(fromIndex, index);
    };

    const handleDragEnd = () => {
        dragIndexRef.current = null;
        setDragOverId(null);
    };

    const updateDescription = (id: string, description: string) => {
        onScreenshotsChange(
            screenshots.map(s => s.id === id ? { ...s, description } : s)
        );
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
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

            {/* Screenshot List */}
            {screenshots.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                            {screenshots.length} screenshot{screenshots.length !== 1 ? "s" : ""} uploaded
                        </span>
                        <span className={`text-xs font-light ${isLight ? "text-neutral-500" : "text-neutral-500"}`}>
                            {maxScreenshots - screenshots.length} remaining
                        </span>
                    </div>

                    <div className="space-y-2">
                        {screenshots.map((screenshot, index) => (
                            <div
                                key={screenshot.id}
                                onDragOver={handleDragOverItem(screenshot.id)}
                                onDrop={handleDropItem(index)}
                                className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${dragOverId === screenshot.id
                                        ? isLight
                                            ? "border-neutral-400 bg-neutral-50"
                                            : "border-white/30 bg-white/5"
                                        : isLight
                                        ? "border-neutral-200 bg-white"
                                        : "border-white/10 bg-[#1E1E1E]"
                                    }`}
                            >
                                {/* Order + Drag Handle */}
                                <div className="flex flex-col items-center gap-1 pt-2">
                                    <span className={`text-xs font-mono ${isLight ? "text-neutral-400" : "text-neutral-500"}`}>
                                        {index + 1}
                                    </span>
                                    <button
                                        type="button"
                                        draggable
                                        onDragStart={handleDragStart(index)}
                                        onDragEnd={handleDragEnd}
                                        className={`p-1.5 rounded transition-colors cursor-grab active:cursor-grabbing ${isLight
                                                ? "hover:bg-neutral-100 text-neutral-500"
                                                : "hover:bg-white/10 text-neutral-400"
                                            }`}
                                        aria-label="Drag to reorder screenshot"
                                    >
                                        <GripVertical size={14} />
                                    </button>
                                </div>

                                {/* Thumbnail */}
                                <div className={`w-20 h-14 rounded overflow-hidden flex-shrink-0 ${isLight ? "bg-neutral-100" : "bg-[#252525]"
                                    }`}>
                                    <img
                                        src={screenshot.preview}
                                        alt={`Screenshot ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Description Input */}
                                <div className="flex-1 min-w-0">
                                    <input
                                        type="text"
                                        value={screenshot.description}
                                        onChange={(e) => updateDescription(screenshot.id, e.target.value)}
                                        placeholder={`What happens in this screen? (optional)`}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${isLight
                                                ? "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400"
                                                : "bg-[#252525] border-white/10 text-white placeholder:text-neutral-600 focus:border-white/30"
                                            }`}
                                    />
                                    <p className={`text-[10px] mt-1 ${isLight ? "text-neutral-400" : "text-neutral-600"}`}>
                                        {screenshot.file.name}
                                    </p>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => removeScreenshot(screenshot.id)}
                                    className={`p-1.5 rounded-lg transition-colors ${isLight
                                            ? "hover:bg-red-50 text-neutral-400 hover:text-red-500"
                                            : "hover:bg-red-500/10 text-neutral-500 hover:text-red-400"
                                        }`}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export type { ScreenshotFile };
