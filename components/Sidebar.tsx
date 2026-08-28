"use client";

import React from "react";
import { UserSession } from "./AuthModal";

export interface SessionItem {
  id: string;
  user_email: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  has_bill?: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenDisputeModal: () => void;
  onAskPrompt: (prompt: string) => void;
  user: UserSession;
  onLogout: () => void;
  activeSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  sessions?: SessionItem[];
  onDeleteSession?: (sessionId: string) => void;
  isLoadingSessions?: boolean;
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function Sidebar({
  isOpen,
  onClose,
  onNewChat,
  onOpenDisputeModal,
  onAskPrompt,
  user,
  onLogout,
  activeSessionId,
  onSelectSession,
  sessions = [],
  onDeleteSession,
  isLoadingSessions = false,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop (only on screens < md) */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* Collapsible Sidebar (ChatGPT / Gemini / Claude style) */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 bg-white flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isOpen
            ? "w-72 md:w-64 lg:w-72 opacity-100 translate-x-0 border-r border-[#E5E7EB] shadow-lg md:shadow-none"
            : "w-0 opacity-0 -translate-x-full md:w-0 md:opacity-0 md:-translate-x-full border-none pointer-events-none"
        }`}
      >
        <div className="w-72 md:w-64 lg:w-72 flex flex-col h-full shrink-0">
          {/* Top Header */}
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs border border-[#E5E7EB] bg-white flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="BillBot AI"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-sm font-extrabold text-[#111827] tracking-tight">
                  BillBot AI
                </span>
                <span className="block text-[10px] font-semibold text-[#26619C]">Patient Advisour</span>
              </div>
            </div>

            {/* Collapse button inside sidebar */}
            <button
              onClick={onClose}
              className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
              title="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={() => {
                onNewChat();
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  onClose();
                }
              }}
              className="w-full py-2.5 px-3.5 bg-[#EBF3FA] hover:bg-[#DCEBFA] border border-[#B9D7F2] text-[#26619C] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#26619C] group-hover:rotate-90 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>New Query</span>
              </div>
              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#B9D7F2] text-[#26619C] font-mono font-semibold">
                + New
              </span>
            </button>
          </div>

          {/* Scrollable Navigation & Chat History */}
          <div className="flex-1 overflow-y-auto px-3 space-y-4 text-xs py-1">
            {/* CHAT HISTORY SECTION */}
            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                <span>Query History</span>
                {sessions.length > 0 && (
                  <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-mono">
                    {sessions.length}
                  </span>
                )}
              </div>

              {isLoadingSessions ? (
                <div className="space-y-1.5 p-1">
                  <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-gray-50 border border-dashed border-[#E5E7EB] text-[11px] text-[#9CA3AF]">
                  No past queries yet. Upload a bill or ask a question to start.
                </div>
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                  {sessions.map((sess) => {
                    const isActive = activeSessionId === sess.id;
                    return (
                      <div
                        key={sess.id}
                        className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#EBF3FA] border-[#26619C]/40 text-[#26619C] font-semibold"
                            : "bg-white border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] text-[#374151]"
                        }`}
                        onClick={() => {
                          onSelectSession?.(sess.id);
                          if (typeof window !== "undefined" && window.innerWidth < 768) {
                            onClose();
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                          <span className="text-xs shrink-0">
                            {sess.has_bill ? "📄" : "💬"}
                          </span>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-xs truncate leading-snug">
                              {sess.title || "Query"}
                            </p>
                            <span className="text-[10px] text-[#9CA3AF] block font-normal">
                              {formatRelativeTime(sess.updated_at)}
                            </span>
                          </div>
                        </div>

                        {/* Delete Button on Hover */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession?.(sess.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                          title="Delete this chat"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick AI Tools */}
            <div>
              <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                Billing Assistants
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    onAskPrompt("I have a dispute with my bill and want to draft an email to the billing team. What details do you need from me?");
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-[#E5E7EB] hover:border-[#26619C]/40 hover:bg-[#F9FAFB] transition-all cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-[#111827] group-hover:text-[#26619C] transition-colors">
                      Dispute Email Writer
                    </div>
                    <div className="text-[10px] text-[#6B7280]">Draft formal audit & hold request</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onAskPrompt("Explain the difference between deductible, copay, coinsurance, and out-of-pocket maximum with simple examples.");
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-[#E5E7EB] hover:border-[#26619C]/40 hover:bg-[#F9FAFB] transition-all cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EBF3FA] text-[#26619C] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-[#111827] group-hover:text-[#26619C] transition-colors">
                      Insurance Glossary
                    </div>
                    <div className="text-[10px] text-[#6B7280]">Plain-English terms & benefits</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onAskPrompt("How can I negotiate a medical bill or ask the hospital for a cash settlement discount / financial aid?");
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-[#E5E7EB] hover:border-[#26619C]/40 hover:bg-[#F9FAFB] transition-all cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-[#111827] group-hover:text-[#26619C] transition-colors">
                      Bill Negotiation Tips
                    </div>
                    <div className="text-[10px] text-[#6B7280]">Cash discounts & aid policies</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* User Auth Profile Footer */}
          <div className="p-3.5 border-t border-[#E5E7EB] bg-[#F9FAFB]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-[#26619C] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                  {user.avatarInitial}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-xs text-[#111827] truncate">{user.name}</div>
                  <div className="text-[10px] text-[#6B7280] truncate">{user.email}</div>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Sign out"
                className="p-2 text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
