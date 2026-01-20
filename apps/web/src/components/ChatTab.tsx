"use client";

import { useState, useEffect } from "react";
import {
    type UXAgentRun,
    type UXAgentChatMessage,
    getUXAgentChatHistory,
    sendUXAgentChatMessage,
} from "@/lib/batch-api";
import {
    MessageCircle,
    Loader2,
    Copy,
} from "lucide-react";
import {
    ChatContainerRoot,
    ChatContainerContent,
    ChatContainerScrollAnchor,
} from "./prompt-kit/chat-container";
import { PromptInput } from "./prompt-kit/prompt-input";
import {
    Message,
    MessageAvatar,
    MessageContent,
    MessageActions,
    MessageAction,
} from "./prompt-kit/message";
import { useTheme } from "@/contexts/theme-context";

interface ChatTabProps {
    run: UXAgentRun;
}

export function ChatTab({ run }: ChatTabProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [messages, setMessages] = useState<UXAgentChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [persona, setPersona] = useState<{ name: string; age: string | number; occupation: string } | null>(null);

    // Helper function to clean markdown and quote formatting from text
    const cleanText = (text: string): string => {
        if (!text) return text;
        let cleaned = text;
        // Remove markdown blockquotes (lines starting with >)
        cleaned = cleaned.replace(/^>\s+/gm, '');
        // Remove HTML blockquote tags
        cleaned = cleaned.replace(/<blockquote[^>]*>/gi, '');
        cleaned = cleaned.replace(/<\/blockquote>/gi, '');
        // Remove markdown bold (**text** or __text__) - do this first before single markers
        cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
        cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
        // Remove markdown italic (*text* or _text_) - after double markers are removed
        cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
        cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
        // Remove markdown code (`text`)
        cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
        // Remove markdown links [text](url)
        cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        // Remove markdown strikethrough (~~text~~)
        cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');
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
    };

    useEffect(() => {
        loadChatHistory();
    }, [run.id]);


    const loadChatHistory = async () => {
        try {
            setLoading(true);
            const result = await getUXAgentChatHistory(run.id);
            setMessages(result.messages || []);

            // Extract persona info from run
            const personaData = run.personaData as any;
            if (personaData) {
                setPersona({
                    name: personaData.name || "Test User",
                    age: personaData.age || "unknown",
                    occupation: personaData.occupation || "user",
                });
            }
        } catch (err) {
            console.error("Failed to load chat history:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || sending) return;

        const userMessage = input.trim();
        setInput("");
        setSending(true);

        // Optimistically add user message
        const tempUserMessage: UXAgentChatMessage = {
            id: `temp-${Date.now()}`,
            uxagentRunId: run.id,
            role: "user",
            content: userMessage,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMessage]);

        try {
            const result = await sendUXAgentChatMessage(run.id, userMessage);

            // Update persona if returned
            if (result.persona) {
                setPersona(result.persona);
            }

            // Add assistant response with streaming
            const assistantMessage: UXAgentChatMessage = {
                id: `temp-${Date.now()}-response`,
                uxagentRunId: run.id,
                role: "assistant",
                content: result.response,
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error("Failed to send message:", err);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
            alert("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };


    const personaName = persona?.name || "Test User";

    if (loading) {
        return (
            <div className={`border p-12 text-center rounded-xl ${
                isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
            }`}>
                <Loader2 size={32} className={`mx-auto mb-3 animate-spin ${
                    isLight ? "text-neutral-500" : "text-neutral-400"
                }`} />
                <p className={`font-light ${
                    isLight ? "text-neutral-600" : "text-neutral-400"
                }`}>Loading chat...</p>
            </div>
        );
    }

    return (
        <div className={`border flex flex-col h-[600px] rounded-xl overflow-hidden ${
            isLight
                ? "bg-white border-neutral-200"
                : "border-white/10 bg-[#1E1E1E]"
        }`}>
            {/* Chat Header - Simplified */}
            <div className={`p-3 flex items-center gap-3 border-b shrink-0 ${
                isLight
                    ? "bg-neutral-50 border-neutral-200"
                    : "bg-[#252525] border-white/10"
            }`}>
                <MessageAvatar role="assistant" fallback={personaName} />
                <div className="flex-1">
                    <h3 className={`font-medium text-sm ${
                        isLight ? "text-neutral-900" : "text-white"
                    }`}>{personaName}</h3>
                    {persona?.age && persona?.occupation && (
                        <p className={`text-xs font-light ${
                            isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>
                            {persona.age} year old {persona.occupation}
                        </p>
                    )}
                </div>
            </div>

            {/* Chat Container */}
            <ChatContainerRoot className="flex-1">
                <ChatContainerContent className="p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center border ${
                                isLight
                                    ? "bg-neutral-100 border-neutral-200"
                                    : "bg-[#252525] border-white/10"
                            }`}>
                                <MessageCircle size={32} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                            </div>
                            <h3 className={`font-medium mb-2 ${
                                isLight ? "text-neutral-900" : "text-white"
                            }`}>Chat with {personaName}</h3>
                            <p className={`font-light text-sm max-w-md ${
                                isLight ? "text-neutral-600" : "text-neutral-400"
                            }`}>
                                Ask questions about their experience testing your website.
                                The AI will respond based on their persona and what they observed during the test.
                            </p>
                            <div className="mt-6 space-y-2">
                                <p className={`text-xs uppercase tracking-wide font-light ${
                                    isLight ? "text-neutral-500" : "text-neutral-500"
                                }`}>Try asking:</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {[
                                        "What was your first impression?",
                                        "What confused you the most?",
                                        "Would you recommend this site?",
                                    ].map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(q)}
                                            className={`text-xs px-3 py-1.5 border transition-colors rounded-lg ${
                                                isLight
                                                    ? "bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50"
                                                    : "bg-[#252525] border-white/10 text-white hover:bg-[#333]"
                                            }`}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => {
                                return (
                                    <Message key={message.id} role={message.role}>
                                        {message.role === "assistant" ? (
                                            <>
                                                <MessageAvatar role="assistant" fallback={personaName} />
                                                <div className="flex-1 max-w-[75%]">
                                                    <div className={`border p-3 rounded-lg ${
                                                        isLight
                                                            ? "bg-neutral-50 border-neutral-200"
                                                            : "bg-[#1E1E1E] border-white/10"
                                                    }`}>
                                                        <MessageContent markdown={false}>
                                                            <p className={`text-sm font-light whitespace-pre-wrap ${
                                                                isLight ? "text-neutral-700" : "text-neutral-300"
                                                            }`}>
                                                                {cleanText(message.content)}
                                                            </p>
                                                        </MessageContent>
                                                        <MessageActions>
                                                            <MessageAction
                                                                tooltip="Copy message"
                                                                onClick={async () => {
                                                                    await navigator.clipboard.writeText(message.content);
                                                                }}
                                                            >
                                                                <Copy size={14} />
                                                            </MessageAction>
                                                        </MessageActions>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex-1 flex justify-end">
                                                    <div className="max-w-[75%]">
                                                        <div className={`border p-3 rounded-lg ${
                                                            isLight
                                                                ? "bg-neutral-900 text-white border-neutral-900"
                                                                : "bg-[#252525] border-white/10"
                                                        }`}>
                                                            <MessageContent markdown={false}>
                                                                <p className={`text-sm font-light whitespace-pre-wrap ${
                                                                    isLight ? "text-white" : "text-white"
                                                                }`}>
                                                                    {message.content}
                                                                </p>
                                                            </MessageContent>
                                                            <MessageActions>
                                                                <MessageAction
                                                                    tooltip="Copy message"
                                                                    onClick={async () => {
                                                                        await navigator.clipboard.writeText(message.content);
                                                                    }}
                                                                >
                                                                    <Copy size={14} />
                                                                </MessageAction>
                                                            </MessageActions>
                                                        </div>
                                                    </div>
                                                </div>
                                                <MessageAvatar role="user" fallback="You" />
                                            </>
                                        )}
                                    </Message>
                                );
                            })}
                            {sending && (
                                <Message role="assistant">
                                    <MessageAvatar role="assistant" fallback={personaName} />
                                    <div className={`border p-3 rounded-lg ${
                                        isLight
                                            ? "bg-neutral-50 border-neutral-200"
                                            : "bg-[#1E1E1E] border-white/10"
                                    }`}>
                                        <div className={`flex items-center gap-2 ${
                                            isLight ? "text-neutral-500" : "text-neutral-400"
                                        }`}>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="text-sm font-light">Typing...</span>
                                        </div>
                                    </div>
                                </Message>
                            )}
                            <ChatContainerScrollAnchor />
                        </>
                    )}
                </ChatContainerContent>
            </ChatContainerRoot>

            {/* Input Area */}
            <PromptInput
                value={input}
                onValueChange={setInput}
                onSubmit={handleSend}
                isLoading={sending}
                placeholder={`Ask ${personaName} about their experience...`}
                disabled={sending}
            />
        </div>
    );
}
