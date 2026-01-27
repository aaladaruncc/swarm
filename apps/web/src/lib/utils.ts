import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanMarkdown(text: string | null | undefined): string {
  if (!text) return "";
  // Remove markdown formatting while preserving text content
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.*?)\*/g, "$1") // Remove italic
    .replace(/`(.*?)`/g, "$1") // Remove inline code
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Convert links to text
    .replace(/^#{1,6}\s+/gm, "") // Remove headers
    .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
    .trim();
}
