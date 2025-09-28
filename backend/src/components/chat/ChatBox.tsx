// src/components/chat/ChatBox.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react"; // ADDED: to pass orgId to hook if you need it later
import { useOrgSettings } from "@/hooks/useOrgSettings"; // ADDED

type Provider = "openai" | "gemini" | "claude";

type Health = {
  openai: { enabled: boolean; available: boolean; model: string; note?: string };
  gemini: { enabled: boolean; available: boolean; model: string; note?: string };
  claude: { enabled: boolean; available: boolean; model: string; note?: string };
};

// ADDED: settings shape from our settings API
type Settings = {
  modelEnabled: { openai: boolean; gemini: boolean; anthropic: boolean }; // anthropic controls 'claude'
  retentionDays: number;
  legalHold: boolean;
};

export default function ChatBox(props: { threadId?: string; defaultProvider?: Provider }) {
  const { threadId, defaultProvider = "openai" } = props;

  const [provider, setProvider] = useState<Provider>(defaultProvider);
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);

  const assistantRef = useRef<string>("");

  // ADDED: tenant settings (admin toggles)
  const { settings, loading: settingsLoading } = useOrgSettings();

  // Helper: read tenant toggle for a provider (anthropic → claude)
  const tenantEnabled = (prov: Provider) => {
    const s = settings as Settings | null;
    if (!s) return prov === "openai"; // until loaded, default allow openai (safe default)
    if (prov === "claude") return !!s.modelEnabled.anthropic;
    return !!(s.modelEnabled as any)[prov];
  };

  // Load provider health
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/health/models", { cache: "no-store" });
        const json: Health = await res.json();
        if (!mounted) return;
        setHealth(json);

        // If current provider is disabled or unavailable (tenant or health), switch to OpenAI
        const isAvailable = (prov: Provider) => {
          if (!tenantEnabled(prov)) return false;
          const h = json[prov];
          return h && h.enabled && h.available;
        };
        if (!isAvailable(provider)) {
          setProvider("openai");
        }
      } catch {
        // if health fails, leave defaults (OpenAI)
        setHealth(null);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]); // rerun availability check when tenant settings load/change

  async function sendMessage() {
    const msg = input.trim();
    if (!msg || isLoading) return;

    // Client-side guard: if tenant disabled this model, stop early
    if (!tenantEnabled(provider)) {
      alert(`That model is disabled by your admin.`);
      return;
    }

    setTranscript(prev => [...prev, { role: "user", text: msg }]);
    setInput("");
    setIsLoading(true);
    assistantRef.current = "";
    setTranscript(prev => [...prev, { role: "assistant", text: "" }]);

    try {
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

      // Handle admin-disabled model (authoritative server check)
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
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  // Combine tenant settings + health for UI state
  const isEnabled = (prov: Provider) =>
    tenantEnabled(prov) && (health ? health[prov].enabled : prov === "openai");

  const isAvailable = (prov: Provider) =>
    tenantEnabled(prov) && (health ? health[prov].enabled && health[prov].available : prov === "openai");

  // When user tries to switch to a disabled model, keep selection and warn
  function onProviderChange(next: Provider) {
    if (!tenantEnabled(next)) {
      alert("That model is disabled by your admin.");
      return;
    }
    setProvider(next);
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4 gap-3">
      {/* Picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Model:</label>
        <select
          value={provider}
          onChange={e => onProviderChange(e.target.value as Provider)}
          className="border rounded-lg px-2 py-1"
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
        {settingsLoading && <span className="text-xs opacity-70">loading policy…</span>}
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-auto border rounded-xl p-3 space-y-3">
        {transcript.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block px-3 py-2 rounded-2xl ${m.role === "user" ? "bg-blue-50" : "bg-gray-50"}`}>
              <div className="text-xs opacity-60 mb-1">{m.role}</div>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-left">
            <div className="inline-block px-3 py-2 rounded-2xl bg-gray-50 animate-pulse">
              <div className="text-xs opacity-60 mb-1">assistant</div>
              <div className="whitespace-pre-wrap">…</div>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2">
        <textarea
          className="flex-1 border rounded-xl p-3 min-h-[60px]"
          placeholder="Type a message (Shift+Enter for newline)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          onClick={() => void sendMessage()}
          disabled={isLoading || !input.trim()}
          className="px-4 py-3 rounded-xl bg-black text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
