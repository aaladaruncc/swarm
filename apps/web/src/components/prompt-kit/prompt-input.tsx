"use client";

import { useState, KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface PromptInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PromptInput({
  value,
  onValueChange,
  onSubmit,
  isLoading = false,
  placeholder = "Type a message...",
  disabled = false,
  className = "",
}: PromptInputProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isLoading && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className={`border-t p-4 shrink-0 ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"} ${className}`}>
      <div className={`flex items-end gap-3 ${isLight ? "bg-neutral-50" : "bg-[#252525]"} border rounded-lg p-2 ${isLight ? "border-neutral-200" : "border-white/10"}`}>
        <textarea
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={`flex-1 resize-none bg-transparent border-0 outline-none text-sm font-light ${
            isLight
              ? "text-neutral-900 placeholder:text-neutral-500"
              : "text-white placeholder:text-neutral-400"
          }`}
          style={{
            minHeight: "24px",
            maxHeight: "120px",
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || isLoading || !value.trim()}
          className={`p-2 rounded-lg transition-colors shrink-0 ${
            disabled || isLoading || !value.trim()
              ? isLight
                ? "text-neutral-400 cursor-not-allowed"
                : "text-neutral-500 cursor-not-allowed"
              : isLight
                ? "bg-neutral-900 text-white hover:bg-neutral-800"
                : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
