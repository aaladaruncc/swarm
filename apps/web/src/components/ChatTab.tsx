"use client";

import { useState, useEffect, useRef } from "react";
import {
    type UXAgentRun,
    type UXAgentChatMessage,
    getUXAgentChatHistory,
    sendUXAgentChatMessage,
} from "@/lib/batch-api";
import {
    MessageCircle,
    Send,
    Loader2,
    User,
    Bot,
    Sparkles
} from "lucide-react";

interface ChatTabProps {
    run: UXAgentRun;
}

export function ChatTab({ run }: ChatTabProps) {
    const [messages, setMessages] = useState<UXAgentChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [persona, setPersona] = useState<{ name: string; age: string | number; occupation: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadChatHistory();
    }, [run.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

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

            // Add assistant response
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const personaName = persona?.name || "Test User";

    if (loading) {
        return (
            <div className="border border-white/10 bg-[#1E1E1E] p-12 text-center rounded-xl">
                <Loader2 size={32} className="mx-auto text-neutral-400 mb-3 animate-spin" />
                <p className="text-neutral-400 font-light">Loading chat...</p>
            </div>
        );
    }

    return (
        <div className="border border-white/10 bg-[#1E1E1E] flex flex-col h-[600px] rounded-xl overflow-hidden">
            {/* Chat Header */}
            <div className="bg-[#252525] text-white p-4 flex items-center gap-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <User size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-white">{personaName}</h3>
                    <p className="text-sm text-neutral-400 font-light">
                        {persona?.age && persona?.occupation ?
                            `${persona.age} year old ${persona.occupation}` :
                            "Simulated user persona"
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Sparkles size={14} />
                    AI Persona
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1E1E1E]">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-[#252525] mx-auto mb-4 flex items-center justify-center border border-white/10">
                            <MessageCircle size={32} className="text-neutral-400" />
                        </div>
                        <h3 className="text-white font-medium mb-2">Chat with {personaName}</h3>
                        <p className="text-neutral-400 font-light text-sm max-w-md">
                            Ask questions about their experience testing your website.
                            The AI will respond based on their persona and what they observed during the test.
                        </p>
                        <div className="mt-6 space-y-2">
                            <p className="text-xs text-neutral-500 uppercase tracking-wide font-light">Try asking:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {[
                                    "What was your first impression?",
                                    "What confused you the most?",
                                    "Would you recommend this site?",
                                ].map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(q)}
                                        className="text-xs px-3 py-1.5 bg-[#252525] border border-white/10 text-white hover:bg-[#333] transition-colors rounded-lg"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {message.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-full bg-[#252525] border border-white/10 flex items-center justify-center shrink-0">
                                        <User size={16} className="text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[75%] p-4 rounded-lg ${message.role === "user"
                                            ? "bg-[#252525] text-white border border-white/10"
                                            : "bg-[#1E1E1E] border border-white/10"
                                        }`}
                                >
                                    {message.role === "assistant" && (
                                        <p className="text-xs text-neutral-400 mb-1 font-medium">{personaName}</p>
                                    )}
                                    <p className={`text-sm font-light whitespace-pre-wrap ${message.role === "user" ? "text-white" : "text-neutral-300"
                                        }`}>
                                        {message.content}
                                    </p>
                                </div>
                                {message.role === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-[#252525] border border-white/10 flex items-center justify-center shrink-0">
                                        <Bot size={16} className="text-white" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {sending && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 rounded-full bg-[#252525] border border-white/10 flex items-center justify-center shrink-0">
                                    <User size={16} className="text-white" />
                                </div>
                                <div className="bg-[#1E1E1E] border border-white/10 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 text-neutral-400">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span className="text-sm font-light">{personaName} is typing...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-white/10 p-4 bg-[#252525]">
                <div className="flex gap-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask ${personaName} about their experience...`}
                        className="flex-1 resize-none border border-white/10 bg-[#1E1E1E] text-white p-3 text-sm focus:outline-none focus:border-white/20 transition-colors rounded-lg placeholder:text-neutral-500"
                        rows={2}
                        disabled={sending}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="self-end px-5 py-3 bg-[#1E1E1E] border border-white/10 text-white hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-lg"
                    >
                        {sending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                    </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2 font-light">
                    Press Enter to send • Shift + Enter for new line
                </p>
            </div>
        </div>
    );
}
