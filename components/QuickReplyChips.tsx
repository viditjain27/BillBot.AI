"use client";

import React from "react";

const QUICK_QUESTIONS = [
  { text: "Why is this bill so high?", icon: "🔍", category: "Cost" },
  { text: "What did insurance pay vs what I owe?", icon: "🛡️", category: "Insurance" },
  { text: "Draft a formal dispute letter", icon: "📄", category: "Dispute" },
  { text: "Are there any billing errors or duplicate codes?", icon: "⚠️", category: "Audit" },
  { text: "Explain deductible vs copay simply", icon: "📘", category: "Glossary" },
  { text: "How can I negotiate a cash settlement discount?", icon: "💬", category: "Savings" },
];

interface QuickReplyChipsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export default function QuickReplyChips({
  onSelect,
  disabled,
}: QuickReplyChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin max-w-full">
      {QUICK_QUESTIONS.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q.text)}
          disabled={disabled}
          className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/5 
                     hover:bg-white/10 hover:border-[#4285F4]/40 border border-white/10 text-foreground/80
                     hover:text-foreground transition-all duration-200 cursor-pointer disabled:opacity-40
                     active:scale-95 flex items-center gap-1.5 shadow-sm"
        >
          <span className="text-xs">{q.icon}</span>
          <span>{q.text}</span>
        </button>
      ))}
    </div>
  );
}
