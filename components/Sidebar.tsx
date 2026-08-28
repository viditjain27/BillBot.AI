"use client";

import React from "react";
import { UserSession } from "./AuthModal";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenDisputeModal: () => void;
  onAskPrompt: (prompt: string) => void;
  user: UserSession;
  onLogout: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  onNewChat,
  onOpenDisputeModal,
  onAskPrompt,
  user,
  onLogout,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 lg:w-72 bg-[#0e131d]/95 md:bg-[#0e131d]/70 border-r border-white/10 backdrop-blur-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1a73e8] via-[#9b72cb] to-[#d96570] flex items-center justify-center p-0.5 shadow-md shadow-[#9b72cb]/20">
              <div className="w-full h-full bg-[#0e131d] rounded-[10px] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                </svg>
              </div>
            </div>
            <div>
              <span className="text-sm font-bold bg-gradient-to-r from-[#4285F4] to-[#9b72cb] bg-clip-text text-transparent">
                BillBot Gemini
              </span>
              <span className="block text-[10px] text-muted-foreground">Medical Billing AI</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
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
              onClose();
            }}
            className="w-full py-2.5 px-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-foreground text-xs font-semibold rounded-2xl transition-all cursor-pointer flex items-center justify-between group shadow-sm hover:border-[#4285F4]/40"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#4285F4] group-hover:rotate-90 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>New consultation</span>
            </div>
            <kbd className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded border border-white/10 text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation & Tools */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4 text-xs py-2">
          {/* AI Tools */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Billing Tools
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  onOpenDisputeModal();
                  onClose();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded-lg bg-[#d96570]/20 text-[#d96570] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">Dispute Letter Writer</div>
                  <div className="text-[10px] text-muted-foreground">No Surprises Act format</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onAskPrompt("Explain the difference between deductible, copay, coinsurance, and out-of-pocket maximum with simple examples.");
                  onClose();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded-lg bg-[#4285F4]/20 text-[#4285F4] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">Insurance Glossary</div>
                  <div className="text-[10px] text-muted-foreground">Deductibles & copays</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onAskPrompt("How can I negotiate a medical bill or ask the hospital for a cash settlement discount / financial aid?");
                  onClose();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded-lg bg-[#2dd4a8]/20 text-[#2dd4a8] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">Bill Negotiation Tips</div>
                  <div className="text-[10px] text-muted-foreground">Cash discounts & aid</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* User Auth Profile Footer */}
        <div className="p-3.5 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285F4] to-[#9b72cb] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-md">
                {user.avatarInitial}
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-xs text-foreground truncate">{user.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
