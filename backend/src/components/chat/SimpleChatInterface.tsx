// Simple chat interface that actually works
"use client";

import React, { useState, useEffect } from "react";
import SimpleThreadSelector from "./SimpleThreadSelector";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Thread {
  id: string;
  title: string;
  created_at: string;
}

export default function SimpleChatInterface() {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);

  // Load thread messages when thread changes
  useEffect(() => {
    if (currentThreadId) {
      loadThreadMessages(currentThreadId);
    } else {
      setMessages([]);
    }
  }, [currentThreadId]);

  const loadThreadMessages = async (threadId: string) => {
    try {
      setThreadLoading(true);
      console.log('Loading messages for thread:', threadId);
      
      const response = await fetch(`/api/threads/${threadId}`);
      const data = await response.json();
      
      console.log('Thread data received:', data);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load thread messages:', error);
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleThreadSelect = (threadId: string) => {
    console.log('SimpleChatInterface: Thread selected:', threadId);
    setCurrentThreadId(threadId);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput("");
    setLoading(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Create thread if none exists
      let threadId = currentThreadId;
      if (!threadId) {
        const threadResponse = await fetch('/api/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: message.substring(0, 50) })
        });
        const threadData = await threadResponse.json();
        threadId = threadData.thread.id;
        setCurrentThreadId(threadId);
        // Trigger sidebar refresh by updating a key
        window.dispatchEvent(new CustomEvent('threadCreated'));
      }

      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          message,
          provider: 'openai'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      // Add empty assistant message
      const assistantMessageObj: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessageObj]);

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
          
          // Update the assistant message
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...assistantMessageObj,
              content: assistantMessage
            };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, there was an error processing your message.",
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700">
        <SimpleThreadSelector
          onThreadSelect={handleThreadSelect}
          currentThreadId={currentThreadId}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <h1 className="text-lg font-semibold text-white">
            The Hive AI Platform
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {threadLoading && (
            <div className="text-center text-gray-400">
              Loading conversation...
            </div>
          )}
          
          {!threadLoading && messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              Start a new conversation by typing a message below.
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="text-xs opacity-70 mb-1">{message.role}</div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg animate-pulse">
                <div className="text-xs opacity-70 mb-1">assistant</div>
                <div>...</div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
