"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Loader2,
  Database,
  Search,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatThread {
  id: string;
  title: string | null;
  updatedAt: string | null;
}

type ToolKey = "execute_sql" | "search_family_archive";

type StreamEvent =
  | { type: "token"; content: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_end"; name: string }
  | { type: "done" }
  | { type: "error"; message: string };

const TOOL_ICONS: Record<ToolKey, "db" | "search"> = {
  execute_sql: "db",
  search_family_archive: "search",
};

function ToolIndicator({ name, label }: { name: string; label: string }) {
  const icon = TOOL_ICONS[name as ToolKey] ?? "search";
  const Icon = icon === "db" ? Database : Search;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
      <Icon className="h-3 w-3" />
      {label}…
    </span>
  );
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface ChatClientProps {
  treeId: string;
  treeName: string;
  initialThreadId: string | null;
}

export function ChatClient({ treeId, treeName, initialThreadId }: ChatClientProps) {
  const t = useTranslations("chat");
  const router = useRouter();

  const [threadId, setThreadId] = useState<string | null>(initialThreadId);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [threadToDelete, setThreadToDelete] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadThreads = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (showLoading) {
        setThreadsLoading(true);
      }

      try {
        const response = await fetch(`/api/chat/threads?treeId=${treeId}`);
        const data: ChatThread[] = await response.json();
        setThreads(data);
      } catch {
        // Best-effort refresh only.
      } finally {
        if (showLoading) {
          setThreadsLoading(false);
        }
      }
    },
    [treeId]
  );

  // Load thread list on mount
  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  // Load messages when threadId changes
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    fetch(`/api/chat/threads/${threadId}?treeId=${treeId}`)
      .then((r) => r.json())
      .then((data: { messages: Message[] }) => setMessages(data.messages ?? []))
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  }, [threadId, treeId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTool]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const startNewThread = useCallback(() => {
    const newId = crypto.randomUUID();
    setThreadId(newId);
    setMessages([]);
    router.replace(`/trees/${treeId}/chat?thread=${newId}`);
  }, [treeId, router]);

  const selectThread = useCallback(
    (id: string) => {
      setThreadId(id);
      router.replace(`/trees/${treeId}/chat?thread=${id}`);
    },
    [treeId, router]
  );

  const deleteThread = useCallback(async () => {
    if (!threadToDelete || deletingThreadId) return;

    const id = threadToDelete.id;
    setDeletingThreadId(id);

    try {
      const response = await fetch(
        `/api/chat/threads/${encodeURIComponent(id)}?treeId=${treeId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete thread");
      }

      setThreads((currentThreads) =>
        currentThreads.filter((thread) => thread.id !== id)
      );

      if (threadId === id) {
        setThreadId(null);
        setMessages([]);
        setActiveTool(null);
        router.replace(`/trees/${treeId}/chat`);
      }

      setThreadToDelete(null);
      toast.success(t("threads.deleteSuccess"));
    } catch {
      toast.error(t("threads.deleteError"));
    } finally {
      setDeletingThreadId(null);
    }
  }, [deletingThreadId, router, t, threadId, threadToDelete, treeId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // If no thread yet, create one now
    const currentThreadId = threadId ?? crypto.randomUUID();
    if (!threadId) {
      setThreadId(currentThreadId);
      router.replace(`/trees/${treeId}/chat?thread=${currentThreadId}`);
    }

    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsStreaming(true);
    setActiveTool(null);

    // Add empty assistant placeholder
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, treeId, threadId: currentThreadId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      // Read the thread ID the server assigned (in case it generated one)
      const serverThreadId = res.headers.get("X-Thread-Id");
      if (serverThreadId && serverThreadId !== currentThreadId) {
        setThreadId(serverThreadId);
        router.replace(`/trees/${treeId}/chat?thread=${serverThreadId}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "token") {
            setActiveTool(null);
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = {
                ...last,
                content: last.content + event.content,
              };
              return updated;
            });
          } else if (event.type === "tool_start") {
            setActiveTool(event.name);
          } else if (event.type === "tool_end") {
            setActiveTool(null);
          } else if (event.type === "error") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: t("error"),
              };
              return updated;
            });
          }
        }
      }

      // Refresh thread list to reflect updated timestamp / new thread
      void loadThreads({ showLoading: false });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: t("error"),
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setActiveTool(null);
      abortRef.current = null;
    }
  }, [input, isStreaming, loadThreads, messages, treeId, threadId, router, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const lastIsAssistant =
    messages.length > 0 && messages[messages.length - 1].role === "assistant";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-muted/30 transition-all duration-200 shrink-0 overflow-hidden",
          sidebarOpen ? "w-64" : "w-0"
        )}
      >
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("threads.history")}
              </span>
            </div>

            <div className="px-2 py-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={startNewThread}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("threads.newChat")}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {threadsLoading ? (
                <p className="text-xs text-muted-foreground px-2 py-3">
                  {t("threads.loading")}
                </p>
              ) : threads.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-3">
                  {t("threads.noHistory")}
                </p>
              ) : (
                threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={cn(
                      "group flex items-start gap-1 rounded-md transition-colors",
                      threadId === thread.id ? "bg-muted" : "hover:bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectThread(thread.id)}
                      className="min-w-0 flex-1 rounded-md px-2 py-2 text-left text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-xs leading-snug">
                            {thread.title ?? t("threads.unnamed")}
                          </p>
                          {thread.updatedAt && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatRelativeTime(thread.updatedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "mt-1 mr-1 h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive",
                        "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                        threadId === thread.id && "sm:opacity-100"
                      )}
                      disabled={
                        isStreaming || messagesLoading || deletingThreadId === thread.id
                      }
                      onClick={() => setThreadToDelete(thread)}
                      title={t("threads.delete")}
                      aria-label={t("threads.deleteAriaLabel", {
                        title: thread.title ?? t("threads.unnamed"),
                      })}
                    >
                      {deletingThreadId === thread.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </aside>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="border-b bg-background px-4 py-2 flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/trees/${treeId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("back")}
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-semibold">
              {treeName} — {t("title")}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>{t("dbCaption")}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={startNewThread}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("threads.newChat")}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t("threads.loading")}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-muted-foreground">
              <Bot className="h-12 w-12 opacity-30" />
              <div>
                <p className="font-medium text-foreground">{t("emptyTitle")}</p>
                <p className="text-sm mt-1">{t("emptyDescription")}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {(["oldest", "marriages", "count", "before1950"] as const).map((key) => {
                  const suggestion = t(`suggestions.${key}`);
                  return (
                    <button
                      key={key}
                      onClick={() => setInput(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                    >
                      {suggestion}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 max-w-3xl",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <Card
                  className={cn(
                    "px-4 py-3 text-sm leading-relaxed max-w-[calc(100%-3rem)]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card"
                  )}
                >
                  {msg.content ? (
                    msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-headings:my-2 prose-headings:font-semibold prose-a:text-primary">
                        <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )
                  ) : isStreaming && i === messages.length - 1 ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t("thinking")}
                    </span>
                  ) : null}

                  {isStreaming &&
                    activeTool &&
                    i === messages.length - 1 &&
                    lastIsAssistant && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <ToolIndicator
                          name={activeTool}
                          label={t(`tools.${activeTool as ToolKey}`, {
                            defaultValue: activeTool,
                          })}
                        />
                      </div>
                    )}
                </Card>
              </div>
            ))
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t bg-background px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder")}
              rows={1}
              disabled={isStreaming || messagesLoading}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 min-h-[40px] max-h-[160px] overflow-y-auto"
            />
            <Button
              onClick={send}
              disabled={!input.trim() || isStreaming || messagesLoading}
              size="icon"
              className="shrink-0 h-10 w-10"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <AlertDialog
          open={threadToDelete !== null}
          onOpenChange={(open) => {
            if (!open && !deletingThreadId) {
              setThreadToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("threads.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("threads.deleteDescription", {
                  title: threadToDelete?.title ?? t("threads.unnamed"),
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingThreadId !== null}>
                {t("threads.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteThread}
                disabled={deletingThreadId !== null}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingThreadId !== null && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("threads.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
