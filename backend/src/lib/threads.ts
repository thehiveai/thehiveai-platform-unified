// Thread persistence utilities for The Hive AI Platform
import { supabaseAdmin } from './supabaseAdmin';

export interface Thread {
  id: string;
  org_id: string;
  title: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  org_id: string;
  thread_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  provider: string | null;
  model_id: string | null;
  input_tokens: number;
  output_tokens: number;
  created_by: string | null;
  created_at: string;
}

// Generate title from first user message (first 50 chars)
function generateTitle(content: string): string {
  const cleaned = content.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 50) return cleaned;
  return cleaned.substring(0, 47) + '...';
}

// Create a new thread
export async function createThread(params: {
  orgId: string;
  createdBy: string;
  title?: string;
}): Promise<Thread> {
  const { data, error } = await supabaseAdmin
    .from('threads')
    .insert([{
      org_id: params.orgId,
      created_by: params.createdBy,
      title: params.title || null
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create thread: ${error.message}`);
  return data;
}

// Get thread by ID
export async function getThread(threadId: string, orgId: string): Promise<Thread | null> {
  const { data, error } = await supabaseAdmin
    .from('threads')
    .select('*')
    .eq('id', threadId)
    .eq('org_id', orgId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get thread: ${error.message}`);
  }
  return data;
}

// Get threads for an org (most recent first)
export async function getThreads(orgId: string, limit = 20): Promise<Thread[]> {
  const { data, error } = await supabaseAdmin
    .from('threads')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to get threads: ${error.message}`);
  return data || [];
}

// Add message to thread
export async function addMessage(params: {
  threadId: string;
  orgId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  provider?: string;
  modelId?: string;
  inputTokens?: number;
  outputTokens?: number;
  createdBy?: string;
}): Promise<Message> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert([{
      thread_id: params.threadId,
      org_id: params.orgId,
      role: params.role,
      content: params.content,
      provider: params.provider || null,
      model_id: params.modelId || null,
      input_tokens: params.inputTokens || 0,
      output_tokens: params.outputTokens || 0,
      created_by: params.createdBy || null
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to add message: ${error.message}`);

  // Auto-generate thread title from first user message
  if (params.role === 'user') {
    await maybeUpdateThreadTitle(params.threadId, params.orgId, params.content);
  }

  return data;
}

// Get messages for a thread (chronological order)
export async function getMessages(threadId: string, orgId: string): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to get messages: ${error.message}`);
  return data || [];
}

// Update thread title (if not already set)
async function maybeUpdateThreadTitle(threadId: string, orgId: string, content: string): Promise<void> {
  const thread = await getThread(threadId, orgId);
  if (!thread || thread.title) return; // Already has title

  const title = generateTitle(content);
  const { error } = await supabaseAdmin
    .from('threads')
    .update({ title })
    .eq('id', threadId)
    .eq('org_id', orgId);

  if (error) {
    console.warn(`Failed to update thread title: ${error.message}`);
  }
}

// Update thread title manually
export async function updateThreadTitle(threadId: string, orgId: string, title: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('threads')
    .update({ title: title.trim() || null })
    .eq('id', threadId)
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to update thread title: ${error.message}`);
}

// Delete thread and all messages
export async function deleteThread(threadId: string, orgId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('threads')
    .delete()
    .eq('id', threadId)
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to delete thread: ${error.message}`);
}
