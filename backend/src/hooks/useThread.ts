// Thread management hook for persistent conversations
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Thread, Message } from '@/lib/threads';

interface UseThreadResult {
  // Current thread state
  thread: Thread | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  
  // Thread operations
  createThread: (title?: string) => Promise<string>;
  loadThread: (threadId: string) => Promise<void>;
  updateThreadTitle: (threadId: string, title: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  
  // Thread list
  threads: Thread[];
  loadThreads: () => Promise<void>;
  threadsLoading: boolean;
}

export function useThread(): UseThreadResult {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new thread
  const createThread = useCallback(async (title?: string): Promise<string> => {
    try {
      setError(null);
      console.log('Creating thread with title:', title);
      
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      console.log('Response status:', response.status, response.ok);

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create thread');
      }

      const newThread = data.thread;
      
      if (!newThread || !newThread.id) {
        throw new Error('Invalid thread data received');
      }
      
      setThread(newThread);
      setMessages([]);
      setThreads(prev => [newThread, ...prev]);
      
      console.log('Thread created successfully:', newThread.id);
      return newThread.id;
    } catch (err: any) {
      console.error('Error creating thread:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Load a specific thread with its messages
  const loadThread = useCallback(async (threadId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/threads/${threadId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load thread');
      }

      const data = await response.json();
      setThread(data.thread);
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err.message);
      setThread(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update thread title
  const updateThreadTitle = useCallback(async (threadId: string, title: string): Promise<void> => {
    try {
      setError(null);
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update thread title');
      }

      // Update local state
      setThread(prev => prev ? { ...prev, title } : null);
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, title } : t));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Delete a thread
  const deleteThread = useCallback(async (threadId: string): Promise<void> => {
    try {
      setError(null);
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete thread');
      }

      // Update local state
      setThreads(prev => prev.filter(t => t.id !== threadId));
      if (thread?.id === threadId) {
        setThread(null);
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [thread]);

  // Load all threads for the organization
  const loadThreads = useCallback(async (): Promise<void> => {
    try {
      setThreadsLoading(true);
      setError(null);
      
      const response = await fetch('/api/threads');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load threads');
      }

      const data = await response.json();
      setThreads(data.threads || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  return {
    // Current thread state
    thread,
    messages,
    loading,
    error,
    
    // Thread operations
    createThread,
    loadThread,
    updateThreadTitle,
    deleteThread,
    
    // Thread list
    threads,
    loadThreads,
    threadsLoading,
  };
}
