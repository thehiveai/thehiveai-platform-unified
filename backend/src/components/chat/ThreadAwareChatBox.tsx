// Thread-aware ChatBox with persistent conversation history
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { useThread } from "@/hooks/useThread";

type Provider = "openai" | "gemini" | "claude";

type Health = {
  openai: { enabled: boolean; available: boolean; model: string; note?: string };
  gemini: { enabled: boolean; available: boolean; model: string; note?: string };
  claude: { enabled: boolean; available: boolean; model: string; note?: string };
};

type Settings = {
  modelEnabled: { openai: boolean; gemini: boolean; anthropic: boolean };
  retentionDays: number;
  legalHold: boolean;
};

interface ThreadAwareChatBoxProps {
  threadId?: string;
  defaultProvider?: Provider;
  onThreadChange?: (threadId: string | null) => void;
}

export default function ThreadAwareChatBox({ 
  threadId, 
  defaultProvider = "openai",
  onThreadChange 
}: ThreadAwareChatBoxProps) {
  const [provider, setProvider] = useState<Provider>(defaultProvider);
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadId || null);

  const assistantRef = useRef<string>("");
  const { settings, loading: settingsLoading } = useOrgSettings();
  const { 
    createThread
  } = useThread();
  
  // Local thread state (not shared globally)
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  
  // Local loadThread function
  const loadThread = useCallback(async (threadId: string): Promise<void> => {
    try {
      setThreadLoading(true);
      setThreadError(null);
      
      const response = await fetch(`/api/threads/${threadId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load thread');
      }

      const data = await response.json();
      setThread(data.thread);
      setMessages(data.messages || []);
    } catch (err: any) {
      setThreadError(err.message);
      setThread(null);
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // Helper: read tenant toggle for a provider
  const tenantEnabled = (prov: Provider) => {
    const s = settings as Settings | null;
    if (!s) return prov === "openai";
    if (prov === "claude") return !!s.modelEnabled.anthropic;
    return !!(s.modelEnabled as any)[prov];
  };

  // Load thread on mount or when threadId changes
  useEffect(() => {
    console.log('ThreadId prop changed:', threadId, 'Current:', currentThreadId);
    if (threadId && threadId !== currentThreadId) {
      console.log('Loading thread:', threadId);
      setCurrentThreadId(threadId);
      setTranscript([]); // Clear transcript when switching threads
      loadThread(threadId).catch((error) => {
        console.warn("Failed to load thread, will create new one:", error);
        // Clear the invalid thread ID
        setCurrentThreadId(null);
        onThreadChange?.(null);
      });
    }
  }, [threadId, currentThreadId, loadThread, onThreadChange]);

  // Convert database messages to transcript format - fixed state management
  useEffect(() => {
    console.log('Messages changed:', messages.length, messages);
    if (messages.length > 0) {
      const newTranscript = messages.map(msg => ({
        role: msg.role as "user" | "assistant",
        text: msg.content
      })).filter(msg => msg.role === "user" || msg.role === "assistant");
      
      console.log('Setting transcript:', newTranscript);
      // Only update transcript if it's actually different to prevent unnecessary re-renders
      setTranscript(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newTranscript)) {
          return newTranscript;
        }
        return prev;
      });
    } else if (!threadLoading && currentThreadId) {
      // Thread loaded but no messages - show empty state
      console.log('Setting empty transcript for thread:', currentThreadId);
      setTranscript([]);
    }
  }, [messages, threadLoading, currentThreadId]);

  // Load provider health - reduced frequency
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/health/models", { cache: "no-store" });
        const json: Health = await res.json();
        if (!mounted) return;
        setHealth(json);

        const isAvailable = (prov: Provider) => {
          if (!tenantEnabled(prov)) return false;
          const h = json[prov];
          return h && h.enabled && h.available;
        };
        if (!isAvailable(provider)) {
          setProvider("openai");
        }
      } catch {
        setHealth(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [settings]); // Removed provider and tenantEnabled to reduce frequency

  // Create new thread if none exists
  const ensureThread = async (): Promise<string> => {
    if (currentThreadId) return currentThreadId;
    
    const newThreadId = await createThread();
    setCurrentThreadId(newThreadId);
    onThreadChange?.(newThreadId);
    return newThreadId;
  };

  async function sendMessage() {
    const msg = input.trim();
    if (!msg || isLoading) return;

    if (!tenantEnabled(provider)) {
      alert(`That model is disabled by your admin.`);
      return;
    }

    try {
      // Ensure we have a thread
      const threadId = await ensureThread();

      setTranscript(prev => [...prev, { role: "user", text: msg }]);
      setInput("");
      setIsLoading(true);
      assistantRef.current = "";
      setTranscript(prev => [...prev, { role: "assistant", text: "" }]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message: msg,
          provider,
          citations: true,
          disclaimer: "Not legal advice.",
        }),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        const err = data?.error || "This model is disabled by your admin.";
        throw new Error(err);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        assistantRef.current += chunk;
        setTranscript(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", text: assistantRef.current };
          return copy;
        });
      }
    } catch (e: any) {
      const err = e?.message || "Sorry, there was a problem.";
      assistantRef.current = err;
      setTranscript(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", text: err };
        return copy;
      });
    } finally {
      setIsLoading(false);
      // Reload thread to get the persisted messages and update the UI
      // This ensures the transcript stays in sync with the database
      if (currentThreadId) {
        setTimeout(() => {
          loadThread(currentThreadId).catch(console.error);
        }, 500); // Small delay to ensure API has processed the message
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const isEnabled = (prov: Provider) =>
    tenantEnabled(prov) && (health ? health[prov].enabled : prov === "openai");

  const isAvailable = (prov: Provider) =>
    tenantEnabled(prov) && (health ? health[prov].enabled && health[prov].available : prov === "openai");

  function onProviderChange(next: Provider) {
    if (!tenantEnabled(next)) {
      alert("That model is disabled by your admin.");
      return;
    }
    setProvider(next);
  }

  // Start new conversation
  const startNewConversation = async () => {
    const newThreadId = await createThread();
    setCurrentThreadId(newThreadId);
    setTranscript([]);
    onThreadChange?.(newThreadId);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4 gap-3 bg-gray-900">
      {/* Thread info and controls */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">
            {thread?.title || (currentThreadId ? "Loading..." : "No thread")}
          </div>
          {threadError && (
            <div className="text-sm text-red-400">Error: {threadError}</div>
          )}
        </div>
        <button
          onClick={startNewConversation}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
        >
          New Chat
        </button>
      </div>

      {/* Model picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-300">Model:</label>
        <select
          value={provider}
          onChange={e => onProviderChange(e.target.value as Provider)}
          className="border border-gray-600 bg-gray-800 text-gray-200 rounded-lg px-2 py-1"
          disabled={settingsLoading}
        >
          <option value="openai">OpenAI (GPT default)</option>

          {isEnabled("gemini") ? (
            <option value="gemini" disabled={!isAvailable("gemini")}>
              Gemini {!isAvailable("gemini") ? "(unavailable)" : ""}
            </option>
          ) : (
            <option value="gemini" disabled>
              Gemini (disabled)
            </option>
          )}

          {isEnabled("claude") ? (
            <option value="claude" disabled={!isAvailable("claude")}>
              Claude {!isAvailable("claude") ? "(unavailable)" : ""}
            </option>
          ) : (
            <option value="claude" disabled>
              Claude (disabled)
            </option>
          )}
        </select>
        {settingsLoading && <span className="text-xs text-gray-500">loading policy…</span>}
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-auto border border-gray-700 bg-gray-800 rounded-xl p-3 space-y-3">
        {threadLoading && (
          <div className="text-center text-gray-400 py-4">
            Loading conversation history...
          </div>
        )}
        
        {!threadLoading && transcript.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            Start a new conversation by typing a message below.
          </div>
        )}

        {transcript.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block px-3 py-2 rounded-2xl max-w-[80%] ${
              m.role === "user" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-700 text-gray-100"
            }`}>
              <div className="text-xs opacity-70 mb-1">{m.role}</div>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="text-left">
            <div className="inline-block px-3 py-2 rounded-2xl bg-gray-700 animate-pulse">
              <div className="text-xs opacity-70 mb-1 text-gray-300">assistant</div>
              <div className="whitespace-pre-wrap text-gray-300">…</div>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2">
        <textarea
          className="flex-1 border border-gray-600 bg-gray-800 text-gray-200 rounded-xl p-3 min-h-[60px] resize-none placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          placeholder="Type a message (Shift+Enter for newline)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isLoading}
        />
        <button
          onClick={() => void sendMessage()}
          disabled={isLoading || !input.trim()}
          className="px-4 py-3 rounded-xl bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
