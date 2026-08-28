"use client";

import React, { useState, useSyncExternalStore } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import LoginPage from "@/components/LoginPage";
import { UserSession } from "@/components/AuthModal";
import DisputeLetterModal from "@/components/DisputeLetterModal";
import { BillSummaryData } from "@/components/BillSummaryCard";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredUserSnapshot(): string | null {
  try {
    return localStorage.getItem("billbot_user_session");
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [activeDisputeBill, setActiveDisputeBill] = useState<BillSummaryData | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [overrideUser, setOverrideUser] = useState<UserSession | null | undefined>(undefined);

  const storedUserRaw = useSyncExternalStore(
    subscribe,
    getStoredUserSnapshot,
    getServerSnapshot
  );

  const user: UserSession | null =
    overrideUser !== undefined
      ? overrideUser
      : storedUserRaw
      ? (() => {
          try {
            return JSON.parse(storedUserRaw);
          } catch {
            return null;
          }
        })()
      : null;

  const handleLoginSuccess = (newUser: UserSession) => {
    setOverrideUser(newUser);
    try {
      localStorage.setItem("billbot_user_session", JSON.stringify(newUser));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setOverrideUser(null);
    try {
      localStorage.removeItem("billbot_user_session");
    } catch {
      // ignore
    }
  };

  const handleNewChat = () => {
    setActiveDisputeBill(null);
    setActivePrompt(null);
    window.location.reload();
  };

  const handleOpenDisputeModal = (billData?: BillSummaryData) => {
    if (billData) {
      setActiveDisputeBill(billData);
    }
    setDisputeModalOpen(true);
  };

  const handleAskPrompt = (promptText: string) => {
    setActivePrompt(promptText);
  };

  // If user is not logged in, render the dedicated LoginPage
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Once authenticated, render the full Gemini Chatbot workspace
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[#0b0f17] text-foreground">
      {/* Gemini Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onOpenDisputeModal={() => handleOpenDisputeModal()}
        onAskPrompt={handleAskPrompt}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Conversational AI Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <ChatWindow
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          user={user}
          onOpenDisputeModal={handleOpenDisputeModal}
          initialPrompt={activePrompt}
          onClearInitialPrompt={() => setActivePrompt(null)}
        />
      </div>

      {/* Medical Dispute Letter Modal */}
      <DisputeLetterModal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        billData={activeDisputeBill}
        userName={user.name}
      />
    </main>
  );
}
