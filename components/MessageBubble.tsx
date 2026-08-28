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
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    // Header 3
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-sm font-bold text-[#111827] mt-3 mb-1.5 flex items-center gap-1.5">
          {line.replace("### ", "")}
        </h4>
      );
    }
    // Header 2
    if (line.startsWith("## ")) {
      return (
        <h3 key={idx} className="text-base font-bold text-[#26619C] mt-3.5 mb-1.5">
          {line.replace("## ", "")}
        </h3>
      );
    }
    // Horizontal Rule
    if (line.trim() === "---") {
      return <hr key={idx} className="my-2.5 border-[#E5E7EB]" />;
    }
    // Bullet point
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      const clean = line.trim().slice(2);
      return (
        <li key={idx} className="ml-4 list-disc text-[#374151] my-0.5 leading-relaxed text-[13px] md:text-sm">
          {renderInlineFormatting(clean)}
        </li>
      );
    }
    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s(.*)$/);
    if (numMatch) {
      return (
        <div key={idx} className="ml-1 flex items-start gap-2 my-1 leading-relaxed text-[13px] md:text-sm">
          <span className="font-bold text-[#26619C] shrink-0 text-xs mt-0.5">{numMatch[1]}.</span>
          <span className="text-[#374151]">{renderInlineFormatting(numMatch[2])}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={idx} className="h-1.5" />;
    }

    return (
      <p key={idx} className="my-1 leading-relaxed text-[#374151] text-[13px] md:text-sm">
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
        <strong key={i} className="font-semibold text-[#111827]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded-md bg-[#F3F4F6] font-mono text-[#26619C] text-xs border border-[#E5E7EB] font-semibold">
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
      className={`flex gap-2.5 md:gap-3 ${isBot ? "justify-start" : "justify-end"} group animate-fade-in`}
      style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}
    >
      {/* Bot Avatar */}
      {isBot && (
        <div className="shrink-0 mt-0.5">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl overflow-hidden shadow-xs border border-[#E5E7EB] bg-white flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="BillBot"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[92%] sm:max-w-[85%] md:max-w-[80%] ${message.type === "bill-summary" ? "w-full max-w-2xl" : ""}`}>
        {message.type === "bill-summary" && message.billData ? (
          <BillSummaryCard
            data={message.billData}
            onDraftDisputeLetter={onDraftDisputeLetter}
            onAskQuestion={onAskQuestion}
          />
        ) : (
          <div className="relative">
            <div
              className={`rounded-2xl px-4 md:px-5 py-3 md:py-3.5 leading-relaxed text-sm ${
                isBot
                  ? "bg-white text-[#111827] border border-[#E5E7EB] rounded-tl-sm shadow-sm"
                  : "bg-[#26619C] text-white font-medium rounded-tr-sm shadow-sm"
              }`}
            >
              {isBot ? renderFormattedMarkdown(message.content) : message.content}
            </div>

            {/* Quick Actions (Copy / Timestamp) */}
            <div className={`flex items-center gap-2 mt-1 px-1.5 ${isBot ? "justify-start" : "justify-end"}`}>
              <span className="text-[10px] text-[#9CA3AF]">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

              {isBot && message.content && (
                <button
                  onClick={handleCopy}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-[#9CA3AF] hover:text-[#26619C] rounded cursor-pointer"
                  title="Copy response"
                >
                  {copied ? (
                    <span className="text-[10px] text-[#26619C] font-semibold">Copied!</span>
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
        <div className="shrink-0 mt-0.5" title={userName}>
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gray-900 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {userAvatar}
          </div>
        </div>
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-2.5 md:gap-3 justify-start animate-fade-in">
      <div className="shrink-0 mt-0.5">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl overflow-hidden shadow-xs border border-[#E5E7EB] bg-white flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="BillBot"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[#26619C] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-[#3B7BBF] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-[#B9D7F2] animate-bounce" />
      </div>
    </div>
  );
}
