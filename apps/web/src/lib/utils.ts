import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Removes markdown formatting from text
 */
export function cleanMarkdown(text: string): string {
  if (!text) return text;
  let cleaned = text;
  
  // Remove markdown blockquotes (lines starting with >)
  cleaned = cleaned.replace(/^>\s+/gm, '');
  // Remove HTML blockquote tags
  cleaned = cleaned.replace(/<blockquote[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/blockquote>/gi, '');
  // Remove markdown bold (**text** or __text__)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  // Remove markdown italic (*text* or _text_)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  // Remove markdown code (`text`)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  // Remove markdown links [text](url)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Remove markdown strikethrough (~~text~~)
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');
  // Remove markdown headers (# ## ###)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  // Remove markdown horizontal rules (--- or ***)
  cleaned = cleaned.replace(/^[-*]{3,}$/gm, '');
  // Remove leading/trailing quotes if the entire text is wrapped
  cleaned = cleaned.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  // Remove any remaining quote markers at the start/end
  cleaned = cleaned.replace(/^["']+/, '');
  cleaned = cleaned.replace(/["']+$/, '');
  
  return cleaned.trim();
}
