// Complete chat interface with thread management
"use client";

import React, { useState, useCallback } from "react";
import ThreadSidebar from "./ThreadSidebar";
import ThreadAwareChatBox from "./ThreadAwareChatBox";
import { useThread } from "@/hooks/useThread";

interface ChatInterfaceProps {
  initialThreadId?: string;
  className?: string;
}

export default function ChatInterface({ 
  initialThreadId,
  className = ""
}: ChatInterfaceProps) {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(initialThreadId || null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const { createThread, loadThreads } = useThread();

  // Handle thread selection from sidebar
  const handleThreadSelect = useCallback((threadId: string) => {
    console.log('ChatInterface: Thread selected:', threadId);
    setCurrentThreadId(threadId);
    console.log('ChatInterface: Current thread ID set to:', threadId);
  }, []);

  // Handle new thread creation
  const handleNewThread = useCallback(async () => {
    try {
      const newThreadId = await createThread();
      setCurrentThreadId(newThreadId);
    } catch (error) {
      console.error("Failed to create new thread:", error);
      alert("Failed to create new conversation. Please try again.");
    }
  }, [createThread]);

  // Handle thread change from chat (when auto-creating threads)
  const handleThreadChange = useCallback((threadId: string | null) => {
    setCurrentThreadId(threadId);
    // Refresh sidebar thread list when new threads are created
    if (threadId) {
      loadThreads();
    }
  }, [loadThreads]);

  return (
    <div className={`flex h-full bg-gray-900 ${className}`}>
      {/* Sidebar */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? "w-0" : "w-80"
      } flex-shrink-0`}>
        <div className={`h-full ${sidebarCollapsed ? "hidden" : "block"}`}>
          <ThreadSidebar
            currentThreadId={currentThreadId}
            onThreadSelect={handleThreadSelect}
            onNewThread={handleNewThread}
          />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with sidebar toggle */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {sidebarCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              )}
            </button>
            
            <h1 className="text-lg font-semibold text-white">
              The Hive AI Platform
            </h1>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            {sidebarCollapsed && (
              <button
                onClick={handleNewThread}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Chat
              </button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 min-h-0">
          <ThreadAwareChatBox
            threadId={currentThreadId || undefined}
            onThreadChange={handleThreadChange}
          />
        </div>
      </div>
    </div>
  );
}
