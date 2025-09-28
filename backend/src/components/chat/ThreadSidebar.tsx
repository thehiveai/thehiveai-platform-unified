// Thread management sidebar with thread list and controls
"use client";

import React, { useState } from "react";
import { useThread } from "@/hooks/useThread";
import { Thread } from "@/lib/threads";

interface ThreadSidebarProps {
  currentThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  className?: string;
}

export default function ThreadSidebar({ 
  currentThreadId, 
  onThreadSelect, 
  onNewThread,
  className = ""
}: ThreadSidebarProps) {
  const { 
    threads, 
    threadsLoading, 
    error,
    updateThreadTitle, 
    deleteThread,
    loadThreads 
  } = useThread();
  
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startEditing = (thread: Thread) => {
    setEditingThreadId(thread.id);
    setEditTitle(thread.title || "");
  };

  const saveTitle = async (threadId: string) => {
    if (!editTitle.trim()) {
      setEditingThreadId(null);
      return;
    }

    try {
      await updateThreadTitle(threadId, editTitle.trim());
      setEditingThreadId(null);
    } catch (error) {
      console.error("Failed to update thread title:", error);
      // Keep editing mode open on error
    }
  };

  const cancelEditing = () => {
    setEditingThreadId(null);
    setEditTitle("");
  };

  const handleDelete = async (threadId: string) => {
    if (!confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteThread(threadId);
      // If we deleted the current thread, the parent should handle switching
    } catch (error) {
      console.error("Failed to delete thread:", error);
      alert("Failed to delete conversation. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-800 border-r border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-100">Conversations</h2>
          <button
            onClick={loadThreads}
            className="p-1 text-gray-400 hover:text-gray-200 rounded"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <button
          onClick={onNewThread}
          className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Conversation
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {threadsLoading && (
          <div className="p-4 text-center text-gray-400">
            Loading conversations...
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {!threadsLoading && threads.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">
            No conversations yet.
            <br />
            Start a new one!
          </div>
        )}

        <div className="p-2 space-y-1">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={`group relative rounded-lg transition-colors ${
                currentThreadId === thread.id
                  ? "bg-blue-600 border border-blue-500"
                  : "hover:bg-gray-700 border border-transparent hover:border-gray-600"
              }`}
            >
              <div
                className="p-3 cursor-pointer"
                onClick={() => onThreadSelect(thread.id)}
              >
                {editingThreadId === thread.id ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-600 bg-gray-800 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Thread title"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveTitle(thread.id);
                        } else if (e.key === "Escape") {
                          cancelEditing();
                        }
                      }}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveTitle(thread.id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`text-sm font-medium truncate ${
                      currentThreadId === thread.id ? "text-white" : "text-gray-200"
                    }`}>
                      {thread.title || "Untitled conversation"}
                    </div>
                    <div className={`text-xs mt-1 ${
                      currentThreadId === thread.id ? "text-blue-100" : "text-gray-400"
                    }`}>
                      {formatDate(thread.created_at)}
                    </div>
                  </>
                )}
              </div>

              {/* Thread actions */}
              {editingThreadId !== thread.id && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(thread);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-200 rounded"
                      title="Edit title"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(thread.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 rounded"
                      title="Delete conversation"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
