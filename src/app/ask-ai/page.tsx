"use client"

import type React from "react"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useEffect, useRef, useState } from "react"

export default function ChatPage() {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    sendMessage({
      parts: [{ type: "text", text: input }],
    })
    setInput("")
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="border-b border-border/50 bg-gradient-to-r from-card via-background to-card px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">Website Assistant</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Ask me anything about this website</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-2xl bg-card p-4">
                <div className="text-4xl">💬</div>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Start a Conversation</h2>
              <p className="max-w-sm text-sm text-muted-foreground">Ask me anything about this website and I&apos;ll search for answers</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {message.role === "user" ? "U" : "A"}
              </div>

              <div className={`flex max-w-md flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "border border-border/50 bg-card text-foreground rounded-tl-sm"
                  }`}
                >
                  {message.parts.map((part, partIndex) => {
                    if (part.type === "text") {
                      return (
                        <p key={partIndex} className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                          {part.text}
                        </p>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border/50 bg-gradient-to-t from-card/50 to-background px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border border-border bg-input px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
            />
            <button type="submit" disabled={!input.trim()} className="whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <svg className="h-4 w-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7m0 0l-7 7m7-7H6" />
              </svg>
              <span className="hidden sm:inline ml-2">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
