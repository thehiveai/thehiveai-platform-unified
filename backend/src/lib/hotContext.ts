// Hot context retrieval for recent conversations across threads

export interface RecentConversation {
  thread_id: string;
  thread_title: string;
  message_content: string;
  message_role: string;
  created_at: string;
  similarity?: number;
}

export interface ContextResult {
  enhancedPrompt: string;
  contextUsed: RecentConversation[];
  processingTimeMs: number;
}

// Performance monitoring for context retrieval
export class ContextPerformanceMonitor {
  private static retrievalTimes: number[] = [];
  private static contextCounts: number[] = [];

  static recordRetrieval(timeMs: number, contextCount: number) {
    this.retrievalTimes.push(timeMs);
    this.contextCounts.push(contextCount);
    
    // Keep only last 100 records
    if (this.retrievalTimes.length > 100) {
      this.retrievalTimes.shift();
      this.contextCounts.shift();
    }
  }

  static getAverageRetrievalTime(): number {
    if (this.retrievalTimes.length === 0) return 0;
    return this.retrievalTimes.reduce((a, b) => a + b, 0) / this.retrievalTimes.length;
  }

  static getAverageContextCount(): number {
    if (this.contextCounts.length === 0) return 0;
    return this.contextCounts.reduce((a, b) => a + b, 0) / this.contextCounts.length;
  }
}

// Lazy-load Supabase client to avoid module-level import issues
async function getSupabaseAdmin() {
  try {
    const { supabaseAdmin } = await import('./supabaseAdmin');
    return supabaseAdmin;
  } catch (error) {
    console.error('Failed to load Supabase client:', error);
    return null;
  }
}

// Get recent conversations from other threads for context
export async function getRecentConversationsContext({
  orgId,
  currentThreadId,
  limit = 10,
  maxMessagesPerThread = 3
}: {
  orgId: string;
  currentThreadId?: string;
  limit?: number;
  maxMessagesPerThread?: number;
}): Promise<RecentConversation[]> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.warn('Supabase client not available, returning empty context');
      return [];
    }

    // Get the most recent 10 threads (excluding current one) - GUARANTEED RECALL
    const threadsQuery = supabaseAdmin
      .from('threads')
      .select('id, title, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10); // Always get exactly 10 most recent threads

    if (currentThreadId) {
      threadsQuery.neq('id', currentThreadId);
    }

    const { data: threads, error: threadsError } = await threadsQuery;

    if (threadsError) {
      console.error('Error fetching threads for context:', threadsError);
      return [];
    }

    if (!threads || threads.length === 0) {
      return [];
    }

    // Get recent messages from ALL these threads - NO FILTERING
    const conversations: RecentConversation[] = [];

    for (const thread of threads) {
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select('content, role, created_at')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(maxMessagesPerThread);

      if (messagesError) {
        console.error(`Error fetching messages for thread ${thread.id}:`, messagesError);
        continue;
      }

      if (messages && messages.length > 0) {
        for (const message of messages) {
          conversations.push({
            thread_id: thread.id,
            thread_title: thread.title || 'Untitled conversation',
            message_content: message.content,
            message_role: message.role,
            created_at: message.created_at
          });
        }
      }
    }

    // Sort by thread creation date (most recent threads first), then by message date
    conversations.sort((a, b) => {
      const threadA = threads.find(t => t.id === a.thread_id);
      const threadB = threads.find(t => t.id === b.thread_id);
      
      if (threadA && threadB) {
        const threadDateDiff = new Date(threadB.created_at).getTime() - new Date(threadA.created_at).getTime();
        if (threadDateDiff !== 0) return threadDateDiff;
      }
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Return ALL conversations from the 10 most recent threads
    return conversations;
  } catch (error) {
    console.error('Error in getRecentConversationsContext:', error);
    return [];
  }
}

// Format recent conversations for AI context
export function formatRecentConversationsForContext(
  conversations: RecentConversation[],
  maxLength = 1500,
  provider?: string
): string {
  if (conversations.length === 0) return '';

  // Claude needs a different format - more direct and explicit
  if (provider === 'claude') {
    let contextString = "Based on our previous conversations, here's what I know about you:\n\n";
    let currentLength = 0;

    // Group by thread for better organization
    const threadGroups = conversations.reduce((groups, conv) => {
      if (!groups[conv.thread_id]) {
        groups[conv.thread_id] = {
          title: conv.thread_title,
          messages: []
        };
      }
      groups[conv.thread_id].messages.push(conv);
      return groups;
    }, {} as Record<string, { title: string; messages: RecentConversation[] }>);

    for (const [threadId, group] of Object.entries(threadGroups)) {
      if (currentLength > maxLength) break;
      
      // Add key information from this thread
      for (const message of group.messages.slice(0, 2)) {
        if (currentLength > maxLength) break;
        
        const messageText = `From "${group.title}": ${message.message_content.substring(0, 150)}\n`;
        if (currentLength + messageText.length > maxLength) break;
        
        contextString += messageText;
        currentLength += messageText.length;
      }
    }

    return contextString;
  }

  // Default format for other providers
  let contextString = "## Recent Conversations Context:\n";
  let currentLength = 0;

  // Group by thread for better organization
  const threadGroups = conversations.reduce((groups, conv) => {
    if (!groups[conv.thread_id]) {
      groups[conv.thread_id] = {
        title: conv.thread_title,
        messages: []
      };
    }
    groups[conv.thread_id].messages.push(conv);
    return groups;
  }, {} as Record<string, { title: string; messages: RecentConversation[] }>);

  for (const [threadId, group] of Object.entries(threadGroups)) {
    const threadHeader = `\n### ${group.title}:\n`;
    if (currentLength + threadHeader.length > maxLength) break;
    
    contextString += threadHeader;
    currentLength += threadHeader.length;

    // Add recent messages from this thread
    for (const message of group.messages.slice(0, 2)) { // Limit to 2 messages per thread
      const messageText = `- ${message.message_role}: ${message.message_content.substring(0, 200)}...\n`;
      if (currentLength + messageText.length > maxLength) break;
      
      contextString += messageText;
      currentLength += messageText.length;
    }
  }

  return contextString;
}

// Get organization ID for a thread
async function getOrgIdForThread(threadId: string): Promise<string | null> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.warn('Supabase client not available for getOrgIdForThread');
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('threads')
      .select('org_id')
      .eq('id', threadId)
      .single();

    if (error) {
      console.error('Error getting org_id for thread:', error);
      return null;
    }

    return data?.org_id || null;
  } catch (error) {
    console.error('Error in getOrgIdForThread:', error);
    return null;
  }
}

// Main function to get context-enhanced prompt
export async function getContextEnhancedPrompt(
  threadId: string,
  userMessage: string,
  options: {
    maxContextMessages?: number;
    minContextLength?: number;
    forceContext?: boolean;
    provider?: string;
  } = {}
): Promise<ContextResult> {
  const startTime = Date.now();
  const { maxContextMessages = 10, minContextLength = 100, forceContext = false, provider } = options;

  try {
    // Get org ID for this thread
    const orgId = await getOrgIdForThread(threadId);
    if (!orgId) {
      console.warn('Could not determine org_id for thread:', threadId);
      return {
        enhancedPrompt: userMessage,
        contextUsed: [],
        processingTimeMs: Date.now() - startTime
      };
    }

    // Get recent conversations for context
    const recentConversations = await getRecentConversationsContext({
      orgId,
      currentThreadId: threadId,
      limit: Math.ceil(maxContextMessages / 3), // Get more threads to ensure we have enough messages
      maxMessagesPerThread: 3
    });

    // Format context with provider-specific formatting
    const contextString = formatRecentConversationsForContext(recentConversations, 1500, provider);

    // Decide whether to include context
    const shouldIncludeContext = forceContext || 
      (contextString.length >= minContextLength && recentConversations.length > 0);

    let enhancedPrompt = userMessage;
    if (shouldIncludeContext && contextString) {
      enhancedPrompt = `${contextString}\n\n## Current User Message:\n${userMessage}`;
    }

    const processingTime = Date.now() - startTime;
    
    // Record performance metrics
    ContextPerformanceMonitor.recordRetrieval(processingTime, recentConversations.length);

    return {
      enhancedPrompt,
      contextUsed: recentConversations,
      processingTimeMs: processingTime
    };
  } catch (error) {
    console.error('Error in getContextEnhancedPrompt:', error);
    return {
      enhancedPrompt: userMessage,
      contextUsed: [],
      processingTimeMs: Date.now() - startTime
    };
  }
}

// Get user's display name from session
export function getUserDisplayName(session: any): string {
  if (!session?.user) return 'User';
  
  // Try to get first name from name
  const fullName = session.user.name;
  if (fullName) {
    const firstName = fullName.split(' ')[0];
    return firstName;
  }
  
  // Try preferred username
  if (session.user.preferred_username) {
    return session.user.preferred_username.split('@')[0]; // Remove domain if email
  }
  
  // Fallback to email username
  if (session.user.email) {
    return session.user.email.split('@')[0];
  }
  
  return 'User';
}

// Get model display name
export function getModelDisplayName(modelId: string): string {
  const modelNames: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
    'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet',
    'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-pro': 'Gemini Pro'
  };
  
  return modelNames[modelId] || modelId;
}
