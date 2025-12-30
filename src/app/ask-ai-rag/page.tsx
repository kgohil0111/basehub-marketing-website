"use client";

import type React from "react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface RAGStatus {
  documentCount: number;
  status: "ready" | "empty" | "loading" | "error";
}

export default function ChatRAGPage() {
  const [input, setInput] = useState("");
  const [ragStatus, setRagStatus] = useState<RAGStatus>({ documentCount: 0, status: "loading" });
  const [isIngesting, setIsIngesting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat-rag",
    }),
  });

  const checkRAGStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rag/ingest");
      const data = await res.json();
      setRagStatus({ documentCount: data.documentCount, status: data.status });
    } catch {
      setRagStatus({ documentCount: 0, status: "error" });
    }
  }, []);

  const triggerIngestion = async () => {
    setIsIngesting(true);
    setRagStatus((prev) => ({ ...prev, status: "loading" }));
    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPages: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        setRagStatus({ documentCount: data.documentCount, status: "ready" });
      } else {
        setRagStatus({ documentCount: 0, status: "error" });
      }
    } catch {
      setRagStatus({ documentCount: 0, status: "error" });
    } finally {
      setIsIngesting(false);
    }
  };

  useEffect(() => {
    checkRAGStatus();
  }, [checkRAGStatus]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage({
      parts: [{ type: "text", text: input }],
    });
    setInput("");
  };

  return (
    <div className="bg-background flex h-screen flex-col">
      <div className="border-border/50 from-card via-background to-card border-b bg-linear-to-r px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-xl font-bold">Website Assistant (RAG)</h1>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Powered by AI SDK embeddings &amp; semantic search
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  ragStatus.status === "ready"
                    ? "bg-green-500"
                    : ragStatus.status === "loading"
                      ? "animate-pulse bg-yellow-500"
                      : ragStatus.status === "error"
                        ? "bg-red-500"
                        : "bg-gray-400"
                }`}
              />
              <span className="text-muted-foreground">
                {ragStatus.status === "ready"
                  ? `${ragStatus.documentCount} docs`
                  : ragStatus.status === "loading"
                    ? "Loading..."
                    : ragStatus.status === "error"
                      ? "Error"
                      : "Empty"}
              </span>
            </div>
            {(ragStatus.status === "empty" || ragStatus.status === "error") && (
              <button
                onClick={triggerIngestion}
                disabled={isIngesting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-2 py-1 text-xs font-medium disabled:opacity-50"
              >
                {isIngesting ? "Indexing..." : "Index Website"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="bg-card mb-4 rounded-2xl p-4">
                <div className="text-4xl">🔍</div>
              </div>
              <h2 className="text-foreground mb-2 text-xl font-semibold">RAG-Powered Search</h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                {ragStatus.status === "ready"
                  ? "Ask me anything about this website - I'll use semantic search to find relevant content"
                  : "Click 'Index Website' to populate the knowledge base first"}
              </p>

              {/* RAG Logic Explanation */}
              <div className="mt-8 max-w-lg rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4 text-left">
                <h3 className="mb-2 text-sm font-semibold text-blue-700">
                  🧠 How Embedding RAG Works
                </h3>
                <ol className="space-y-2 text-xs text-blue-600">
                  <li>
                    <span className="font-medium">1. Ingest:</span> Crawl website &amp; chunk
                    content into pieces
                  </li>
                  <li>
                    <span className="font-medium">2. Embed:</span> Convert chunks to TF-IDF vectors
                    (free, no API)
                  </li>
                  <li>
                    <span className="font-medium">3. Store:</span> Save vectors to JSON file or
                    PostgreSQL
                  </li>
                  <li>
                    <span className="font-medium">4. Search:</span> Cosine similarity + keyword
                    boost finds matches
                  </li>
                  <li>
                    <span className="font-medium">5. Generate:</span> Groq LLM answers using
                    retrieved context
                  </li>
                </ol>
                <div className="mt-3 rounded bg-blue-100 p-2 font-mono text-[10px] text-blue-500">
                  Ingest → Embed → Store → Query → Similarity Search → Context → LLM
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`animate-in fade-in-50 slide-in-from-bottom-2 flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {message.role === "user" ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>

              <div
                className={`flex max-w-md flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "rounded-tl-sm border border-gray-200 bg-white text-gray-900"
                  }`}
                >
                  {message.parts.map((part, partIndex) => {
                    if (part.type === "text") {
                      if (message.role === "assistant") {
                        return (
                          <div
                            key={partIndex}
                            className="prose prose-sm prose-gray prose-p:mt-0 prose-p:mb-2 prose-p:last:mb-0 prose-a:text-blue-500 prose-a:underline prose-a:decoration-1 prose-a:underline-offset-2 hover:prose-a:text-blue-400 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-strong:font-semibold prose-ul:my-2 prose-li:my-0 max-w-none text-sm leading-relaxed"
                          >
                            <ReactMarkdown
                              components={{
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 underline decoration-1 underline-offset-2 transition-colors hover:text-blue-400"
                                  >
                                    {children}
                                  </a>
                                ),
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              }}
                            >
                              {part.text
                                .replace(/【([^】]+)】/g, "[$1]($1)")
                                .replace(/\[https?:\/\/[^\]]+\]/g, (match) => {
                                  const url = match.slice(1, -1);
                                  return `[Link](${url})`;
                                })}
                            </ReactMarkdown>
                          </div>
                        );
                      } else {
                        return (
                          <p key={partIndex} className="text-sm leading-relaxed wrap-break-word">
                            {part.text}
                          </p>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-border/50 from-card/50 to-background border-t bg-linear-to-t px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="border-border bg-input text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary/50 flex-1 rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              autoComplete="off"
              disabled={ragStatus.status !== "ready"}
            />
            <button
              type="submit"
              disabled={!input.trim() || ragStatus.status !== "ready"}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap disabled:opacity-50"
            >
              <svg
                className="inline-block h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7m0 0l-7 7m7-7H6"
                />
              </svg>
              <span className="ml-2 hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
