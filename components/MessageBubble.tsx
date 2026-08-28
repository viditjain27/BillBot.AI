"use client";

import React, { useState } from "react";
import BillSummaryCard, { BillSummaryData } from "./BillSummaryCard";

export interface ChatMessageItem {
  id: string;
  role: "user" | "bot";
  content: string;
  type?: "text" | "bill-summary";
  billData?: BillSummaryData;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: ChatMessageItem;
  index: number;
  userName?: string;
  userAvatar?: string;
  onDraftDisputeLetter?: (data: BillSummaryData) => void;
  onAskQuestion?: (question: string) => void;
}

function renderFormattedMarkdown(text: string) {
  // Line-by-line markdown rendering
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    // Header 3
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-sm font-bold text-foreground mt-3 mb-1.5 flex items-center gap-1.5">
          {line.replace("### ", "")}
        </h4>
      );
    }
    // Header 2
    if (line.startsWith("## ")) {
      return (
        <h3 key={idx} className="text-base font-bold gradient-text mt-3 mb-1.5">
          {line.replace("## ", "")}
        </h3>
      );
    }
    // Horizontal Rule
    if (line.trim() === "---") {
      return <hr key={idx} className="my-2 border-border/80" />;
    }
    // Bullet point
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      const clean = line.trim().slice(2);
      return (
        <li key={idx} className="ml-4 list-disc text-foreground/90 my-0.5 leading-relaxed">
          {renderInlineFormatting(clean)}
        </li>
      );
    }
    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s(.*)$/);
    if (numMatch) {
      return (
        <div key={idx} className="ml-2 flex items-start gap-1.5 my-1 leading-relaxed">
          <span className="font-semibold text-primary shrink-0">{numMatch[1]}.</span>
          <span>{renderInlineFormatting(numMatch[2])}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }

    return (
      <p key={idx} className="my-1 leading-relaxed text-foreground/90">
        {renderInlineFormatting(line)}
      </p>
    );
  });
}

function renderInlineFormatting(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-primary text-[11px] border border-border">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function MessageBubble({
  message,
  index = 0,
  userName = "You",
  userAvatar = "U",
  onDraftDisputeLetter,
  onAskQuestion,
}: MessageBubbleProps) {
  const isBot = message.role === "bot";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"} group animate-fade-in`}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      {/* Bot Avatar */}
      {isBot && (
        <div className="shrink-0 mt-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1a73e8] via-[#9b72cb] to-[#d96570] flex items-center justify-center p-0.5 shadow-lg shadow-[#9b72cb]/20">
            <div className="w-full h-full bg-[#131924] rounded-[10px] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[88%] md:max-w-[80%] ${message.type === "bill-summary" ? "w-full max-w-xl" : ""}`}>
        {message.type === "bill-summary" && message.billData ? (
          <BillSummaryCard
            data={message.billData}
            onDraftDisputeLetter={onDraftDisputeLetter}
            onAskQuestion={onAskQuestion}
          />
        ) : (
          <div className="relative">
            <div
              className={`rounded-3xl px-4 md:px-5 py-3.5 text-sm leading-relaxed ${
                isBot
                  ? "bg-[#131924]/90 text-foreground border border-white/10 rounded-tl-md shadow-md"
                  : "bg-gradient-to-r from-[#1a73e8] to-[#4285F4] text-white font-medium rounded-tr-md shadow-lg shadow-[#4285F4]/20"
              }`}
            >
              {isBot ? renderFormattedMarkdown(message.content) : message.content}
            </div>

            {/* Quick Actions (Copy / Timestamp) */}
            <div className={`flex items-center gap-2 mt-1 px-1 ${isBot ? "justify-start" : "justify-end"}`}>
              <span className="text-[10px] text-muted-foreground/70">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

              {isBot && (
                <button
                  onClick={handleCopy}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                  title="Copy response"
                >
                  {copied ? (
                    <span className="text-[10px] text-[#2dd4a8]">Copied!</span>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {!isBot && (
        <div className="shrink-0 mt-1" title={userName}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285F4] to-[#9b72cb] text-white font-bold flex items-center justify-center text-xs shadow-md">
            {userAvatar}
          </div>
        </div>
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <div className="shrink-0 mt-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1a73e8] via-[#9b72cb] to-[#d96570] flex items-center justify-center p-0.5 shadow-lg shadow-[#9b72cb]/20">
          <div className="w-full h-full bg-[#131924] rounded-[10px] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="bg-[#131924] border border-white/10 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5 shadow-md">
        <span className="w-2 h-2 rounded-full bg-[#4285F4] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-[#9b72cb] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-[#d96570] animate-bounce" />
      </div>
    </div>
  );
}
