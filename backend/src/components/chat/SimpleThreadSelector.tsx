// Simple thread selector that actually works
"use client";

import React, { useState, useEffect } from "react";

interface Thread {
  id: string;
  title: string;
  created_at: string;
}

interface SimpleThreadSelectorProps {
  onThreadSelect: (threadId: string) => void;
  currentThreadId: string | null;
}

export default function SimpleThreadSelector({ onThreadSelect, currentThreadId }: SimpleThreadSelectorProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      const response = await fetch('/api/threads');
      const data = await response.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = (threadId: string) => {
    console.log('SimpleThreadSelector: Thread clicked:', threadId);
    console.log('SimpleThreadSelector: Calling onThreadSelect with:', threadId);
    onThreadSelect(threadId);
    console.log('SimpleThreadSelector: onThreadSelect called');
  };

  if (loading) {
    return <div className="p-4 text-gray-400">Loading threads...</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-white font-semibold mb-4">Conversations</h3>
      <div className="space-y-2">
        {threads.map((thread) => (
          <div
            key={thread.id}
            onClick={() => handleThreadClick(thread.id)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              currentThreadId === thread.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            <div className="font-medium truncate">
              {thread.title || 'Untitled conversation'}
            </div>
            <div className="text-xs opacity-70 mt-1">
              {new Date(thread.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
