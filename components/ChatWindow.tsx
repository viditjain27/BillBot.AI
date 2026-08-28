"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble, { TypingIndicator, ChatMessageItem } from "./MessageBubble";
import QuickReplyChips from "./QuickReplyChips";
import UploadButton from "./UploadButton";
import { BillSummaryData } from "./BillSummaryCard";
import { UserSession } from "./AuthModal";

interface ChatWindowProps {
  onToggleSidebar?: () => void;
  user: UserSession;
  onOpenDisputeModal: (billData?: BillSummaryData) => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export default function ChatWindow({
  onToggleSidebar,
  user,
  onOpenDisputeModal,
  initialPrompt,
  onClearInitialPrompt,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [activeBill, setActiveBill] = useState<BillSummaryData | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const messageText = (textToSend || input).trim();
      if (!messageText || isLoading) return;

      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      const userMessage: ChatMessageItem = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const history = messages
          .filter((m) => m.content && m.content.trim().length > 0)
          .map((m) => ({
            role: (m.role === "user" ? "user" : "model") as "user" | "model",
            content: m.content,
          }));

        let enrichedPrompt = messageText;
        if (activeBill) {
          enrichedPrompt = `[CONTEXT: Active medical bill from "${activeBill.provider}", Total: $${activeBill.totalCharged}, Insurance Paid: $${activeBill.insuranceCovered}, Patient Owes: $${activeBill.patientBalance}]\n\nQuestion: ${messageText}`;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: enrichedPrompt,
            history,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to get response");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let streamedText = "";
        let buffer = "";
        const botMessageId = `msg-${Date.now()}-bot`;

        setMessages((prev) => [
          ...prev,
          {
            id: botMessageId,
            role: "bot",
            content: "",
            timestamp: new Date(),
          },
        ]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice(6).trim();
                if (dataStr) {
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.text) {
                      streamedText += parsed.text;
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === botMessageId
                            ? { ...msg, content: streamedText }
                            : msg
                        )
                      );
                    }
                  } catch {
                    // Incomplete JSON chunk or control event, ignore
                  }
                }
              }
            }
          }

          // Process any remaining data in buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6).trim());
                if (parsed.text) {
                  streamedText += parsed.text;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMessageId
                        ? { ...msg, content: streamedText }
                        : msg
                    )
                  );
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-err`,
            role: "bot",
            content:
              "I ran into an issue connecting to Gemini. Please try asking again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, activeBill]
  );

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt, onClearInitialPrompt, handleSend]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadFileName(file.name);

    const userUploadMsg: ChatMessageItem = {
      id: `upload-${Date.now()}-user`,
      role: "user",
      content: `📎 Uploaded bill: ${file.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userUploadMsg]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-bill", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse bill");
      }

      if (data.bill) {
        const parsedData = data.bill;
        const lineItems = (parsedData.lineItems || []).map((li: Record<string, unknown>) => ({
          code: String(li.code || "Service"),
          description: String(li.description || "Medical Service"),
          charged: Number(li.charged || 0),
          insurancePaid: Number(li.insurancePaid || 0),
          youOwe: Number(li.youOwe || li.charged || 0),
          flag: li.flag ? String(li.flag) : undefined,
        }));

        const parsedSummaryData: BillSummaryData = {
          provider: parsedData.provider || "Medical Provider",
          dateOfService: parsedData.dateOfService || "Recent Encounter",
          totalCharged: Number(parsedData.totalCharged || 0),
          insuranceCovered: Number(parsedData.insuranceCovered || 0),
          patientBalance: Number(parsedData.patientBalance || 0),
          lineItems,
          notes: Array.isArray(parsedData.notes) ? parsedData.notes : [],
        };

        setActiveBill(parsedSummaryData);

        setMessages((prev) => [
          ...prev,
          {
            id: `parse-${Date.now()}-card`,
            role: "bot",
            content: "",
            type: "bill-summary",
            billData: parsedSummaryData,
            timestamp: new Date(),
          },
          {
            id: `parse-${Date.now()}-text`,
            role: "bot",
            content: `I've analyzed **${file.name}**. Above is your plain-English breakdown with insurance contributions and any potential billing concerns. How would you like to proceed?`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `parse-${Date.now()}-err`,
          role: "bot",
          content: `⚠️ ${err instanceof Error ? err.message : "Error analyzing file. Please try uploading a clearer image or PDF."}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsUploading(false);
      setUploadFileName(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col h-full bg-[#0b0f17] text-foreground overflow-hidden"
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-[#4285F4]/20 backdrop-blur-md border-2 border-dashed border-[#4285F4] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#131924] p-6 rounded-3xl shadow-2xl text-center border border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-[#4285F4]/20 text-[#4285F4] mx-auto flex items-center justify-center mb-3">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h3 className="font-bold text-foreground text-sm">Drop medical bill or EOB</h3>
            <p className="text-xs text-muted-foreground mt-1">Supports PDF, PNG, JPEG & WebP</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="h-14 px-4 md:px-6 border-b border-white/10 bg-[#0e131d]/80 backdrop-blur-xl flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-xl transition-colors cursor-pointer md:hidden"
            title="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#1a73e8] via-[#9b72cb] to-[#d96570] flex items-center justify-center p-0.5">
              <div className="w-full h-full bg-[#0e131d] rounded-[6px] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                </svg>
              </div>
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-[#4285F4] to-[#9b72cb] bg-clip-text text-transparent">
              BillBot
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4285F4]/15 text-[#4285F4] font-mono font-semibold">
              AI Assistant
            </span>
          </div>
        </div>

        {/* Right Session Badge */}
        <div className="flex items-center gap-2">
          {activeBill && (
            <button
              onClick={() => onOpenDisputeModal(activeBill)}
              className="px-3 py-1.5 bg-[#d96570]/20 hover:bg-[#d96570]/30 border border-[#d96570]/40 text-[#d96570] text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span>Dispute Letter</span>
            </button>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#4285F4] to-[#9b72cb] text-white text-xs font-bold flex items-center justify-center shadow-sm">
              {user.avatarInitial}
            </div>
            <span className="text-xs font-medium text-foreground hidden sm:inline">{user.name}</span>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 ? (
          /* GEMINI STYLE HERO GREETING & STARTERS */
          <div className="max-w-3xl mx-auto py-8 md:py-16 space-y-8 animate-fade-in">
            {/* Greeting */}
            <div className="space-y-2">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-[#4285F4] via-[#9b72cb] to-[#d96570] bg-clip-text text-transparent">
                  Hello, {user.name}
                </span>
              </h2>
              <p className="text-xl md:text-2xl font-semibold text-muted-foreground/80">
                How can I help you understand your medical bills today?
              </p>
            </div>

            {/* Gemini Starter Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              <button
                onClick={() => {
                  const inputEl = document.getElementById("bill-upload-input");
                  inputEl?.click();
                }}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#4285F4]/40 text-left transition-all duration-200 cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground group-hover:text-[#4285F4] transition-colors">
                    Upload & analyze a medical bill
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-[#4285F4]/15 text-[#4285F4] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Upload an image or PDF of your bill or EOB for instant line-item breakdown.
                </p>
              </button>

              <button
                onClick={() =>
                  handleSend("What are the most common medical billing errors or surprise out-of-network charges to watch out for?")
                }
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#9b72cb]/40 text-left transition-all duration-200 cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground group-hover:text-[#9b72cb] transition-colors">
                    Check for surprise billing & errors
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-[#9b72cb]/15 text-[#9b72cb] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Understand your rights under the Federal No Surprises Act.
                </p>
              </button>

              <button
                onClick={() =>
                  handleSend("Explain how deductibles, copays, coinsurance, and out-of-pocket maximums work in plain English.")
                }
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#2dd4a8]/40 text-left transition-all duration-200 cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground group-hover:text-[#2dd4a8] transition-colors">
                    Insurance terms made simple
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-[#2dd4a8]/15 text-[#2dd4a8] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Clear, jargon-free explanations of your health plan benefits.
                </p>
              </button>

              <button
                onClick={() =>
                  handleSend("How do I write a formal dispute letter for an unfair hospital or doctor bill?")
                }
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#d96570]/40 text-left transition-all duration-200 cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground group-hover:text-[#d96570] transition-colors">
                    Draft a formal dispute letter
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-[#d96570]/15 text-[#d96570] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Generate ready-to-mail letters to freeze collection and request an audit.
                </p>
              </button>
            </div>
          </div>
        ) : (
          /* CONVERSATION FEED */
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                index={i}
                userName={user.name}
                userAvatar={user.avatarInitial}
                onDraftDisputeLetter={(data) => onOpenDisputeModal(data)}
                onAskQuestion={(q) => handleSend(q)}
              />
            ))}

            {isLoading && <TypingIndicator />}

            {isUploading && (
              <div className="flex items-center gap-3 p-3.5 bg-white/5 border border-[#4285F4]/40 rounded-2xl text-xs text-foreground animate-pulse max-w-md">
                <div className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                <span>
                  Analyzing <strong>{uploadFileName}</strong> with vision OCR...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Floating Input Area */}
      <div className="p-3 md:p-4 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/90 to-transparent shrink-0">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Quick Prompts */}
          <QuickReplyChips
            onSelect={(q) => handleSend(q)}
            disabled={isLoading || isUploading}
          />

          {/* Floating Pill Input Box */}
          <div className="relative flex items-end gap-2 bg-[#131924] border border-white/10 focus-within:border-[#4285F4]/60 focus-within:ring-1 focus-within:ring-[#4285F4]/40 rounded-3xl p-2.5 transition-all shadow-2xl shadow-black/80">
            <UploadButton onFileSelect={handleFileUpload} />

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputResize}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your bill or upload an image/PDF..."
              className="flex-1 bg-transparent resize-none text-xs md:text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none max-h-28 py-2 px-2 leading-relaxed"
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || isUploading}
              className="p-2.5 rounded-full bg-gradient-to-tr from-[#1a73e8] via-[#4285F4] to-[#9b72cb] text-white font-semibold hover:opacity-95 active:scale-95 disabled:opacity-30 transition-all cursor-pointer shadow-lg shadow-[#4285F4]/20 shrink-0"
              title="Send message"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 px-2">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>BillBot may display inaccurate info — verify with your provider</span>
          </div>
        </div>
      </div>
    </div>
  );
}
