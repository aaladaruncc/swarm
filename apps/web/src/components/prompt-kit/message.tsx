"use client";

import { ReactNode } from "react";
import { User, Bot, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface MessageProps {
  children: ReactNode;
  role?: "user" | "assistant";
  className?: string;
}

export function Message({ children, role = "assistant", className = "" }: MessageProps) {
  return (
    <div className={`flex gap-3 ${role === "user" ? "justify-end" : "justify-start"} ${className}`}>
      {children}
    </div>
  );
}

interface MessageAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  role?: "user" | "assistant";
}

export function MessageAvatar({ src, alt, fallback, role = "assistant" }: MessageAvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || fallback}
        className="w-8 h-8 rounded-full border border-white/10 shrink-0"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-[#252525] border border-white/10 flex items-center justify-center shrink-0">
      {role === "user" ? (
        <Bot size={16} className="text-white" />
      ) : (
        <User size={16} className="text-white" />
      )}
    </div>
  );
}

interface MessageContentProps {
  children: ReactNode;
  markdown?: boolean;
  className?: string;
}

export function MessageContent({ children, markdown = false, className = "" }: MessageContentProps) {
  if (markdown && typeof children === "string") {
    return (
      <div className={`prose prose-invert max-w-none ${className}`}>
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 text-neutral-300">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-neutral-300">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-neutral-300">{children}</ol>,
            li: ({ children }) => <li className="ml-4 text-neutral-300">{children}</li>,
            strong: ({ children }) => <strong className="font-medium text-white">{children}</strong>,
            em: ({ children }) => <em className="italic text-neutral-300">{children}</em>,
            code: ({ children }) => (
              <code className="bg-[#252525] px-1.5 py-0.5 rounded text-sm text-neutral-300">{children}</code>
            ),
            pre: ({ children }) => (
              <pre className="bg-[#252525] p-3 rounded-lg overflow-x-auto text-sm text-neutral-300">{children}</pre>
            ),
          }}
        >
          {children}
        </ReactMarkdown>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

interface MessageActionsProps {
  children: ReactNode;
  className?: string;
}

export function MessageActions({ children, className = "" }: MessageActionsProps) {
  return <div className={`flex items-center gap-1 mt-2 ${className}`}>{children}</div>;
}

interface MessageActionProps {
  children: ReactNode;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
}

export function MessageAction({ children, tooltip, onClick, className = "" }: MessageActionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`p-1.5 hover:bg-white/5 transition-colors rounded text-neutral-400 hover:text-white ${className}`}
      >
        {children}
      </button>
      {tooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-[#1E1E1E] border border-white/10 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {tooltip}
        </div>
      )}
    </div>
  );
}
