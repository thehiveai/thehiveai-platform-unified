// Development chat page - bypasses authentication for testing
"use client";

import DevChatInterface from "@/components/chat/DevChatInterface";

export default function ChatDevPage() {
  return (
    <div className="h-[100dvh]">
      <DevChatInterface />
    </div>
  );
}
