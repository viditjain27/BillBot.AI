"use client";

import React from "react";

const QUICK_QUESTIONS = [
  { text: "Why is my bill so high?", icon: "🔍", category: "Cost" },
  { text: "What did insurance cover vs what I owe?", icon: "🛡️", category: "Insurance" },
  { text: "Help me dispute this bill", icon: "✍️", category: "Dispute" },
  { text: "Find possible billing errors or duplicate codes", icon: "⚠️", category: "Audit" },
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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full">
      {QUICK_QUESTIONS.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q.text)}
          disabled={disabled}
          className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white 
                     hover:bg-[#EBF3FA] hover:border-[#26619C]/40 border border-[#E5E7EB] text-[#374151]
                     hover:text-[#26619C] transition-all duration-200 cursor-pointer disabled:opacity-40
                     active:scale-95 flex items-center gap-1.5 shadow-sm"
        >
          <span className="text-xs">{q.icon}</span>
          <span>{q.text}</span>
        </button>
      ))}
    </div>
  );
}
