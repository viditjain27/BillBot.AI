"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import Sidebar, { SessionItem } from "@/components/Sidebar";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [activeDisputeBill, setActiveDisputeBill] = useState<BillSummaryData | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [overrideUser, setOverrideUser] = useState<UserSession | null | undefined>(undefined);

  // Set initial sidebar state on mount based on screen width
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSidebarOpen(window.innerWidth >= 1024);
    }
  }, []);

  // Sessions state for Chat History
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [chatKey, setChatKey] = useState(0);

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

  const fetchUserSessions = useCallback(async (email: string) => {
    if (!email) return;
    setIsLoadingSessions(true);
    try {
      const res = await fetch(`/api/sessions?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Fetch sessions on user login
  useEffect(() => {
    if (user?.email) {
      fetchUserSessions(user.email);
    }
  }, [user?.email, fetchUserSessions]);

  const handleLoginSuccess = (newUser: UserSession) => {
    setOverrideUser(newUser);
    try {
      localStorage.setItem("billbot_user_session", JSON.stringify(newUser));
    } catch {
      // ignore
    }
    if (newUser.email) {
      fetchUserSessions(newUser.email);
    }
  };

  const handleLogout = () => {
    setOverrideUser(null);
    setSessions([]);
    setActiveSessionId(null);
    setChatKey((k) => k + 1);
    try {
      localStorage.removeItem("billbot_user_session");
    } catch {
      // ignore
    }
  };

  const handleNewChat = () => {
    setActiveDisputeBill(null);
    setActivePrompt(null);
    setActiveSessionId(null);
    setChatKey((k) => k + 1);
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setActivePrompt(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setChatKey((k) => k + 1);
      }
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
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
    <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Gemini Sidebar with Chat History */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onOpenDisputeModal={() => handleOpenDisputeModal()}
        onAskPrompt={handleAskPrompt}
        user={user}
        onLogout={handleLogout}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        sessions={sessions}
        onDeleteSession={handleDeleteSession}
        isLoadingSessions={isLoadingSessions}
      />

      {/* Main Conversational AI Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <ChatWindow
          key={activeSessionId ? `session-${activeSessionId}` : `new-${chatKey}`}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          user={user}
          onOpenDisputeModal={handleOpenDisputeModal}
          initialPrompt={activePrompt}
          onClearInitialPrompt={() => setActivePrompt(null)}
          activeSessionId={activeSessionId}
          onSessionCreated={(newId) => {
            setActiveSessionId(newId);
            if (user?.email) fetchUserSessions(user.email);
          }}
          onSessionUpdated={() => {
            if (user?.email) fetchUserSessions(user.email);
          }}
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
