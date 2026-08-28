"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble, { TypingIndicator, ChatMessageItem } from "./MessageBubble";
import QuickReplyChips from "./QuickReplyChips";
import UploadButton from "./UploadButton";
import { BillSummaryData } from "./BillSummaryCard";
import { UserSession } from "./AuthModal";

interface ChatWindowProps {
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
  user: UserSession;
  onOpenDisputeModal: (billData?: BillSummaryData) => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  activeSessionId?: string | null;
  onSessionCreated?: (sessionId: string) => void;
  onSessionUpdated?: () => void;
}

export default function ChatWindow({
  onToggleSidebar,
  onNewChat,
  user,
  onOpenDisputeModal,
  initialPrompt,
  onClearInitialPrompt,
  activeSessionId,
  onSessionCreated,
  onSessionUpdated,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [activeBill, setActiveBill] = useState<BillSummaryData | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(activeSessionId || null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef<string>("");

  // Track bot reply count for "Connect to Human" feature
  const botReplyCount = messages.filter((m) => m.role === "bot" && m.type !== "bill-summary").length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load session messages when activeSessionId changes
  useEffect(() => {
    setCurrentSessionId(activeSessionId || null);

    if (!activeSessionId) {
      setMessages([]);
      setActiveBill(null);
      return;
    }

    let isMounted = true;
    async function loadSessionData() {
      try {
        const res = await fetch(`/api/sessions/${activeSessionId}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (Array.isArray(data.messages)) {
          const loadedMessages: ChatMessageItem[] = data.messages.map((m: {
            id: string;
            role: "user" | "bot";
            content: string;
            type: "text" | "bill-summary";
            billData?: BillSummaryData | null;
            timestamp: string;
          }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            type: m.type,
            billData: m.billData || undefined,
            timestamp: new Date(m.timestamp),
          }));

          setMessages(loadedMessages);

          // Restore active bill if present
          const lastBillMsg = [...loadedMessages].reverse().find((m) => m.type === "bill-summary" && m.billData);
          if (lastBillMsg?.billData) {
            setActiveBill(lastBillMsg.billData);
          } else {
            setActiveBill(null);
          }
        }
      } catch (err) {
        console.error("Failed to load session messages:", err);
      }
    }

    loadSessionData();
    return () => {
      isMounted = false;
    };
  }, [activeSessionId]);

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        baseInputRef.current = input.trim();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        const currentSpoken = fullTranscript.trim();
        const base = baseInputRef.current;
        setInput(base ? `${base} ${currentSpoken}` : currentSpoken);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Voice input error:", err);
      setIsListening(false);
    }
  };

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
          const curr = activeBill.currencySymbol || "$";
          enrichedPrompt = `[PATIENT: ${user.name}]\n[CONTEXT: Active medical bill from "${activeBill.provider}", Currency: ${curr}, Total Charged: ${curr}${activeBill.totalCharged}, Insurance Paid: ${curr}${activeBill.insuranceCovered}, Patient Balance: ${curr}${activeBill.patientBalance}]\n\nQuestion: ${messageText}`;
        } else {
          enrichedPrompt = `[PATIENT: ${user.name}]\n\nQuestion: ${messageText}`;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionId || undefined,
            userEmail: user.email,
            message: enrichedPrompt,
            history,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to get response");
        }

        const newSessionId = res.headers.get("X-Session-Id");
        if (newSessionId && newSessionId !== currentSessionId) {
          setCurrentSessionId(newSessionId);
          onSessionCreated?.(newSessionId);
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
                  } catch {}
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

        // Refresh sessions list
        onSessionUpdated?.();
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-err`,
            role: "bot",
            content:
              "I ran into an issue connecting. Please try asking again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, activeBill, user.name, user.email, currentSessionId, onSessionCreated, onSessionUpdated]
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
    if (currentSessionId) {
      formData.append("sessionId", currentSessionId);
    }
    if (user.email) {
      formData.append("userEmail", user.email);
    }

    try {
      const res = await fetch("/api/parse-bill", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse bill");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.sessionId && data.sessionId !== currentSessionId) {
        setCurrentSessionId(data.sessionId);
        onSessionCreated?.(data.sessionId);
      }

      const parsedData = data.bill || data.billMessage?.billData || data.parsed;

      if (parsedData) {
        const lineItems = (parsedData.lineItems || []).map((li: Record<string, unknown>) => ({
          code: String(li.code || "Service"),
          description: String(li.description || "Medical Service"),
          charged: Number(li.charged || 0),
          insurancePaid: Number(li.insurancePaid || 0),
          youOwe: Number(li.youOwe || li.charged || 0),
          flag: li.flag ? String(li.flag) : undefined,
        }));

        const currSymbol = String(parsedData.currencySymbol || "$");
        const parsedSummaryData: BillSummaryData = {
          provider: parsedData.provider || "Medical Provider",
          dateOfService: parsedData.dateOfService || "Recent Encounter",
          currencySymbol: currSymbol,
          totalCharged: Number(parsedData.totalCharged || 0),
          insuranceCovered: Number(parsedData.insuranceCovered || 0),
          patientBalance: Number(parsedData.patientBalance || 0),
          lineItems,
          notes: Array.isArray(parsedData.notes) ? parsedData.notes : [],
        };

        setActiveBill(parsedSummaryData);

        const followUpText =
          data.followUpMessage?.content ||
          `I've analyzed **${file.name}**. Above is your plain-English breakdown showing insurance contributions, patient responsibility, and any potential billing flags. Ask me any question about these charges!`;

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
            content: followUpText,
            timestamp: new Date(),
          },
        ]);

        // Refresh sessions list
        onSessionUpdated?.();
      } else {
        throw new Error("Unable to extract structured details from this bill. Please ensure the photo/PDF is clear.");
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

  const handleConnectToHuman = () => {
    handleSend(
      "I'm not satisfied with the answers so far and would like to speak to a human billing specialist. Please tell me: (1) What information I should have ready before calling, (2) Typical billing department phone hours, and (3) What to say when I call."
    );
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col h-full bg-[#F7F9FB] text-[#111827] overflow-hidden"
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-[#26619C]/10 backdrop-blur-xs border-2 border-dashed border-[#26619C] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-xl text-center border border-[#E5E7EB] max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#EBF3FA] text-[#26619C] mx-auto flex items-center justify-center mb-3 text-2xl font-bold">
              📄
            </div>
            <h3 className="font-bold text-[#111827] text-sm">Drop medical bill or EOB</h3>
            <p className="text-xs text-[#6B7280] mt-1">Supports PDF, PNG, JPG & WebP</p>
          </div>
        </div>
      )}

      {/* Top Header Navigation (Blinkit-inspired clean bar) */}
      <header className="h-16 px-3 md:px-6 border-b border-[#E5E7EB] bg-white sticky top-0 flex items-center justify-between gap-2 md:gap-3 shrink-0 z-20">
        {/* Left Brand & Navigation */}
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-xl transition-colors cursor-pointer flex items-center justify-center"
            title="Toggle sidebar & history"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Back button when inside a conversation */}
          {(messages.length > 0 || activeSessionId) && (
            <button
              onClick={() => onNewChat?.()}
              className="p-2 text-[#26619C] hover:bg-[#EBF3FA] active:bg-[#DCEBFA] rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs shrink-0"
              title="Go back to Home / New Query"
              aria-label="Go back"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div
            onClick={() => onNewChat?.()}
            className="flex items-center gap-2 cursor-pointer select-none group"
            title="Go to Home"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs border border-[#E5E7EB] bg-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="BillBot AI"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-base font-extrabold text-[#111827] tracking-tight group-hover:text-[#26619C] transition-colors">
                BillBot AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#EBF3FA] text-[#26619C] font-bold">
                Medical Billing Assistance
              </span>
            </div>
          </div>
        </div>

        {/* Center Contextual Search Trigger Bar */}
        <div className="hidden md:flex flex-1 max-w-lg mx-4">
          <div
            onClick={() => textareaRef.current?.focus()}
            className="w-full bg-[#F3F4F6] hover:bg-[#E5E7EB]/70 border border-transparent hover:border-[#D1D5DB] rounded-xl px-3.5 py-2 flex items-center gap-2.5 cursor-text transition-all text-xs text-[#6B7280]"
          >
            <svg className="w-4 h-4 text-[#9CA3AF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span className="truncate">Ask anything about your medical bill, charges or insurance...</span>
          </div>
        </div>

        {/* Right Session & Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Quick New Query Button */}
          <button
            onClick={() => onNewChat?.()}
            className="flex md:hidden items-center gap-1 px-2.5 py-1.5 bg-[#EBF3FA] active:bg-[#DCEBFA] border border-[#B9D7F2] text-[#26619C] text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Start new query"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New</span>
          </button>

          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full bg-[#26619C] text-white text-xs font-bold flex items-center justify-center shadow-sm">
              {user.avatarInitial}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-[#111827] leading-none">{user.name}</div>
              <div className="text-[10px] text-[#6B7280] leading-none mt-1">Patient Session</div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages / Dashboard Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 ? (
          /* BLINKIT-INSPIRED HERO & DASHBOARD */
          <div className="max-w-3xl mx-auto py-4 md:py-8 space-y-6 animate-fade-in">
            {/* Header Greeting */}
            <div className="text-center md:text-left space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF3FA] text-[#26619C] text-xs font-bold mb-1">
                <span>👋</span>
                <span>Welcome, {user.name}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight">
                Understand your medical bill in seconds.
              </h2>
              <p className="text-xs md:text-sm text-[#6B7280] max-w-xl">
                Upload your medical bill or Explanation of Benefits (EOB) to get instant plain-English explanations, audit potential errors, and take action.
              </p>
            </div>

            {/* 4-Step Patient Journey Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                <div className="text-xs font-bold text-[#26619C]">1. Upload Bill</div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">Photo or PDF file</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                <div className="text-xs font-bold text-[#26619C]">2. Understand</div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">Plain-English breakdown</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                <div className="text-xs font-bold text-[#26619C]">3. Ask Questions</div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">Text or Voice typing</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                <div className="text-xs font-bold text-[#26619C]">4. Dispute</div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">Automated dispute email</div>
              </div>
            </div>

            {/* Prominent Upload Card */}
            <div className="p-6 md:p-8 rounded-2xl bg-white border-2 border-dashed border-[#26619C]/40 hover:border-[#26619C] transition-all text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#EBF3FA] text-[#26619C] mx-auto flex items-center justify-center mb-3 text-2xl font-bold">
                📄
              </div>
              <h3 className="text-base md:text-lg font-bold text-[#111827]">
                Upload your medical bill
              </h3>
              <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
                PDF, JPG, PNG or WebP — works with hospital statements, pharmacy receipts, and insurance EOBs
              </p>

              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => {
                    const inputEl = document.getElementById("bill-upload-input");
                    inputEl?.click();
                  }}
                  className="px-6 py-2.5 bg-[#26619C] hover:bg-[#1C4B79] text-white text-xs md:text-sm font-bold rounded-xl shadow-md shadow-[#26619C]/20 transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span>Choose Medical Bill to Analyze</span>
                </button>
              </div>
            </div>

            {/* Quick Action Starter Cards */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Common Billing Questions
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    handleSend("What are the most common medical billing errors or surprise out-of-network charges to watch out for?")
                  }
                  className="p-4 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#26619C]/40 text-left transition-all cursor-pointer group shadow-2xs flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                    ⚠️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827] group-hover:text-[#26619C] transition-colors">
                      Check for surprise billing & errors
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">
                      Understand your rights under consumer protections and the No Surprises Act.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() =>
                    handleSend("Explain how deductibles, copays, coinsurance, and out-of-pocket maximums work in plain English.")
                  }
                  className="p-4 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#26619C]/40 text-left transition-all cursor-pointer group shadow-2xs flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EBF3FA] text-[#26619C] flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                    📘
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827] group-hover:text-[#26619C] transition-colors">
                      Insurance terms made simple
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">
                      Clear, jargon-free explanations of deductibles, copays, and coinsurance.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() =>
                    handleSend("I have a dispute with my bill and want to draft an email. What details do you need from me?")
                  }
                  className="p-4 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#26619C]/40 text-left transition-all cursor-pointer group shadow-2xs flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                    ✍️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827] group-hover:text-[#26619C] transition-colors">
                      Draft a formal dispute email
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">
                      Answer 2 quick questions to get a customized, ready-to-send dispute letter.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() =>
                    handleSend("How can I negotiate a medical bill or ask the hospital for a cash settlement discount / financial aid?")
                  }
                  className="p-4 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#26619C]/40 text-left transition-all cursor-pointer group shadow-2xs flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                    💬
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827] group-hover:text-[#26619C] transition-colors">
                      Negotiate cash discount & aid
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">
                      Tips on how to ask clinic accounts for cash settlement discounts.
                    </div>
                  </div>
                </button>
              </div>
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
              <div className="flex items-center gap-3 p-3.5 bg-white border border-[#26619C]/30 rounded-2xl text-xs text-[#111827] shadow-sm animate-pulse max-w-md">
                <div className="w-4 h-4 border-2 border-[#26619C] border-t-transparent rounded-full animate-spin shrink-0" />
                <span>
                  Analyzing <strong>{uploadFileName}</strong> with vision OCR...
                </span>
              </div>
            )}

            {/* Connect to Human — appears after 3+ bot replies */}
            {botReplyCount >= 3 && !isLoading && (
              <div className="flex justify-center pt-2 animate-fade-in">
                <button
                  onClick={handleConnectToHuman}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer shadow-2xs"
                >
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                  <span>Still have questions? Connect to a billing specialist</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Floating Input Area (Blinkit-inspired clean input) */}
      <div className="p-3 md:p-4 bg-gradient-to-t from-[#F7F9FB] via-[#F7F9FB]/95 to-transparent shrink-0">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Quick Prompts Chips */}
          <QuickReplyChips
            onSelect={(q) => handleSend(q)}
            disabled={isLoading || isUploading}
          />

          {/* Floating Pill Input Box */}
          <div className="relative flex items-end gap-2 bg-white border border-[#E5E7EB] focus-within:border-[#26619C] focus-within:ring-2 focus-within:ring-[#26619C]/20 rounded-2xl p-2 transition-all shadow-md">
            <UploadButton onFileSelect={handleFileUpload} />

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputResize}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your bill or upload an image/PDF..."
              className="flex-1 bg-transparent resize-none text-xs md:text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none max-h-28 py-2 px-1 leading-relaxed"
            />

            {/* Voice Input Mic Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isLoading || isUploading}
              className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-300"
                  : "text-[#6B7280] hover:text-[#26619C] hover:bg-[#EBF3FA]"
              }`}
              title={isListening ? "Listening... Click to stop speaking" : "Speak to type question (Voice input)"}
            >
              {isListening ? (
                <div className="flex items-center gap-0.5 px-1">
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-4 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce" />
                </div>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3v6a3 3 0 003 3z" />
                </svg>
              )}
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || isUploading}
              className="p-2.5 rounded-xl bg-[#26619C] text-white font-bold hover:bg-[#1C4B79] active:scale-95 disabled:opacity-30 transition-all cursor-pointer shadow-sm shrink-0"
              title="Send message"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] px-1">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>BillBot AI helps explain medical bills — verify charges with your provider</span>
          </div>
        </div>
      </div>
    </div>
  );
}
