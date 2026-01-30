"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User } from "lucide-react";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

interface ChatBoxProps {
    treeId: string;
}

export function ChatBox({ treeId }: ChatBoxProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    treeId,
                }),
            });

            if (!response.ok) throw new Error("Failed to send message");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            const assistantMessage: Message = { role: "assistant", content: "" };
            setMessages((prev) => [...prev, assistantMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg.role === "assistant") {
                        lastMsg.content += chunk;
                    }
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Chat Error", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="flex flex-col h-[500px] w-full max-w-md shadow-lg">
            <CardHeader className="py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bot className="w-4 h-4" /> Family Historian
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                {m.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                )}

                                <div
                                    className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${m.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                >
                                    {m.content}
                                </div>

                                {m.role === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2 items-center text-xs text-muted-foreground ml-10">
                                <span className="animate-pulse">Thinking...</span>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about family history..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading}>
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
